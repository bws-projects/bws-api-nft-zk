import { getTransactionReceiptWithTimeoutAsync } from "./@bws-lib/network.mjs";


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

async function blockchainCallTransferAsync(request, config, contract, provider, status, stateMachineResult) {


    try {

        /*        
        https://docs.bws.ninja/solutions/bws.nft.zk/operations#transfer-nft
        There are 2 types of "transfer" operations:
            - toWallet  : the transfer is blockchain related from 'config.contractOwner' (BWS) to toWallet 'request.parameters.toWallet'
            - toEmail   : the transfer is not blockchain related, it's just a notification sent to the email address 'request.parameters.toEmail'
                        ? the email notification will include the proof of registry (snapshot) of the NFT and a way to claim it.
                        ? the email notification will include a unique code that will be used to claim the NFT.
        */

        if (request.parameters.toWallet && request.parameters.toEmail) {
            throw new FatalError("Incorrect transfer parameters");
        } else if (request.parameters.toWallet) {
            /* we do a regular NFT contract transfer */
            switch (status) {
                // ? We are running for the first time, we need to call the contract
                case JobStatus.registered: {


                    /* we call the contract */
                    let txHash, txNonce;
                    ({ txHash, txNonce } = await callTransferAsync(request, nftJsonUri, config, contract, provider));
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

                    // call handling is complete (state machine "FINISHED" status),
                    stateMachineResult.stateMachineStatus = "FINISHED";
                    break;
                }
            }

        } else if (request.parameters.toEmail) {
            /* we send an email notification to the recipient */
        } else {
            throw new FatalError("Incorrect transfer parameters");
        }

    } finally {
        return stateMachineResult;
    }

}

/**
 * This function interact with the contract to mint nft and return txHash, txNonce.
 */
async function callTransferAsync(request, nftJsonUri, config, contract, provider) {
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
        .safeTransferFrom(config.contractOwner.toString(), request.parameters.toWallet, options)
        .then((txResponse) => {
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

export { blockchainCallTransferAsync };