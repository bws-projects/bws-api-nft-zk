import { getTransactionReceiptWithTimeoutAsync } from "./@bws-lib/network.mjs";
import { uploadJSONToIPFSAsync } from "./ipfs-service.mjs";

import { sendSnapshotEventAsync, getGasLimit } from "./common.mjs";

/* BWS node Libraries */
import { log, FatalError } from "@blockchain-web-services/bws-library-node-common";
import {
    updateJobStatusAsync,
    getJobStatusAsync,
    JobStatus,
    updateJobHashAsync,
    updateJobReceiptAsync,
    updateJobResultAsync,
    addNewNFTzKAsync,
    listNFTzKAsync
} from "@blockchain-web-services/bws-library-node-data";
/**********************/

async function blockchainCallNewAsync(request, config, contract, provider, status, stateMachineResult) {

    try {
        switch (status) {
            // ? We are running for the first time, we need to call the contract
            case JobStatus.registered: {

                /* should we save the image to IPFS?
                if (request.parameters.image.indexOf("ipfs://") === 0)
                  var nftImageUIri = IPFS.save(request.parameters.image);
                else
                  var nftImageUIri = request.parameters.image;
                */
                var nftImageUri = request.parameters.image;

                var nftJson = {
                    "name": request.parameters.name,
                    "description": request.parameters.description,
                    "image": nftImageUri,
                    "attributes": request.parameters.attributes
                };
                stateMachineResult.nftJson = nftJson;

                /* we need to upload NFT json to IPFS and get the new NFT JSON URI */
                const nftIPFSHash = await uploadJSONToIPFSAsync(config.ipfs_key, config.ipfs_api_secret_key, nftJson);
                stateMachineResult.nftIPFSHash = nftIPFSHash;

                /*  https://docs.ipfs.tech/how-to/best-practices-for-nft-data/#metadata
                    We save IPFS URI, not gateway URL
                */
                const nftJsonUri = /* config.ipfs_base_url */ "ipfs://" + nftIPFSHash;

                /* we call the contract */
                let txHash, txNonce;
                ({ txHash, txNonce } = await callNewAsync(request, nftJsonUri, config, contract, provider));
                stateMachineResult.txHash = txHash;

                /* We save transaction hash for the related JOB */
                await updateJobHashAsync(request.jobId, txHash);

                /* we set job as running, meaning the contract has been called but we need to go for the receipt */
                await updateJobStatusAsync(request.jobId, JobStatus.running);


                stateMachineResult.stateMachineStatus = "RUNNING";

                break;
            }
            // ? Smart contract call has been made, and we're waiting for the receipt (NFT minted)
            case JobStatus.running: {

                /* get the receipt */
                let txReceipt = await getTransactionReceiptWithTimeoutAsync(stateMachineResult.txHash, provider, config.timeout);
                let txUrl = config.txBaseUrl + stateMachineResult.txHash;

                await updateJobReceiptAsync(request.jobId, JSON.stringify(txReceipt), txUrl);

                /* we need to update our database with a new NFT linked to the user */
                console.log(stateMachineResult);
                await addNewNFTzKAsync(request.userId, request.jobId, stateMachineResult.nftIPFSHash, stateMachineResult.txHash, stateMachineResult.nftJson)


                // ! BWS.NFT.zK "new" operation requires a snapshot to be created
                try {
                    /* 
                    ? we request to start the snapshot process to create the certificate of trust / proof of registry
                    */
                    await sendSnapshotEventAsync(request);
                    await updateJobStatusAsync(request.jobId, JobStatus.snapshotting);
                } catch (error) {
                    // TODO: we should take care of such error (eg. retry or something)
                    log(error);
                    /* ! proof of register may not be available - but everything else finished correctly */
                    await updateJobStatusAsync(request.jobId, JobStatus.completed);
                }

                // call handling is complete (state machine "FINISHED" status),
                // but job still hasn't finished (job status "snapshotting") and will now be handled by the snapshot state machine.
                stateMachineResult.stateMachineStatus = "FINISHED";
                break;
            }
        }
    } finally {
        return stateMachineResult;
    }
}

/**
 * This function interact with the contract to mint nft and return txHash, txNonce.
 */
async function callNewAsync(request, nftJsonUri, config, contract, provider) {
    //Get gasLimit
    let gasLimit = await getGasLimit(request, config, contract, provider);

    //Get the nonce of the wallet to pass with the contract call.
    const contractnonce = await provider.getTransactionCount(config.contractOwner, "latest");
    console.log("contractnonce: ", contractnonce);

    const options = {
        timeout: config.timeout,
        gasLimit: gasLimit,
        nonce: contractnonce,
    };


    // Invoke the contract, listen for the transaction hash immediately after it gets sent, and also capture the nonce, without waiting for the transaction to be confirmed
    let { txHash, txNonce } = await contract
        .mintWithTokenURI(config.contractOwner.toString(), nftJsonUri, options)
        .then((txResponse) => {
            console.log("txResponse: ", txResponse);

            let txHash = txResponse.hash;
            let txNonce = txResponse.nonce;
            return { txHash, txNonce };
        })
        .catch((error) => {
            // Check if it's a timeout error
            if (error.message && error.message.includes("timeout")) {
                console.error("Transaction Timeout Error:", error);
            } else {
                // Handle other errors or transaction failure
                console.error("Transaction Error:", error);
            }

            //! we throw a regular error, not a FatalError, because we can recover from this error (so we retry)
            //? state machine will retry the lambda call several times.
            throw new Error(`Error in callNew ${error}`);
        });

    return { txHash, txNonce };
}

export { blockchainCallNewAsync };