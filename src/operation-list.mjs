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

async function blockchainCallListAsync(request, stateMachineResult) {

    try {

        // note to @nuwan - we will setup a synchronous mechanism for such calls - for now, let's fetch and update the JOB with the list of NFTs.

        /*
          https://docs.bws.ninja/solutions/bws.nft.zk/operations#list-nfts
          
          This repo is responsible of handling ALL the solution operations 
          (also the ones that do not interact with blockchain, or the ones that may be synchroonous in future version of the platform).
          
          The "list" operation returns the list of NFTS onwed by a customer and registered in OUR database.
          ! we do not query the blockchain for this operation, we just query our database.

        */

        /* we get the list of NFTs from the database */
        const nfts = await listNFTzKAsync(request.userId);

        /* we update the jobs with the list of NFTs */
        await updateJobResultAsync(request.jobId, JSON.stringify({ "value": nfts }));

        /* we set the job status as completed */
        await updateJobStatusAsync(request.jobId, JobStatus.completed);

        /* we set the state machine as finished */
        stateMachineResult.stateMachineStatus = "FINISHED";

    } finally {
        return stateMachineResult;
    }

}

export { blockchainCallListAsync };