import { StatesStatus, loadStatesData } from "./@bws-lib/states.mjs";

import { getContractAsync } from "./contractProvider.mjs";
import { loadConfigAsync } from "./configProvider.mjs";

import { blockchainCallNewAsync } from "./operation-new.mjs";
import { blockchainCallListAsync } from "./operation-list.mjs";
import { blockchainCallTransferAsync } from "./operation-transfer.mjs";

/* BWS node Libraries */
import { log, FatalError } from "@blockchain-web-services/bws-library-node-common";
import {
  updateJobStatusAsync,
  getJobStatusAsync,
  JobStatus,
} from "@blockchain-web-services/bws-library-node-data";
/**********************/

/*************************************************************************************************************************************
// ! Important Note

// To stop the state machine, you must change stateMachineResult.stateMachineStatus to "FINISHED" or "FAILED".
// Use throw new FatalError("<message>") to throw an exception that set stateMachineStatus to "FAILED" and cause the state machine to stop.
// By using 'new FatalError' we can distinguish which parts of the code cause an exception we can not recover/retry from.
   
// ! JOB status and State Machine status are different things (even if sometimes they have the same value)

// JOB Statuses:
//  registered  = job is ready to be processed, entry state when running for the first time
//  running     = job is being processed, in this context, the blockchain call is being made and we are waiting for the transaction to be mined
//  snapshotting= job is being processed, in this context, the snapshot is being created and we are waiting for the snapshot to be created
//  failed      = job has failed, in this context, the transaction has failed and we cannot recover and the job is complete

// STATE MACHINE Statuses:
//  RUNNING     = state machine is running (default state)
//  FAILED      = state machine is in failed status
//  FINISHED    = state machine is in finished status

**************************************************************************************************************************************/

export async function handler(event) {
  log(event);

  /*  
      The following is an example of the event payload sent by the state machine 
      including the operation parameters (https://docs.bws.ninja/solutions/bws.nft.zk/)

      "detail": {
          "solution": "BWS.NFT.zK",
          "version": 1,
          "network": "mumbai",
          "operation": "new",
          "parameters": {
            "name": "BWS NFT",
            "description": "My First NFT",
            "image": "https://uploads-ssl.webflow.com/6474d385cfec71cb21a92251/647dde8bbe8f094f5a0ee2c1_bws-violet.svg",
            "attributes": {
              "trait_type": "Rarity",
              "value": "Ultra rare"
            }
          },
          "jobId": "042244ec-1186-4336-979a-148b2212d1d8",
          "userId": "fce33382-d773-4407-9b0c-20a2322ab1",
          "bwsId": "672b1d9b-526c-444d-aac8-25cf13222b6f"
        }
  */
  var request = event.detail.Payload;

  /* We load the state machine to pass parameters on iterations data and set status to RUNNING */
  var stateMachineResult = loadStatesData(event, StatesStatus.RUNNING);

  try {
    // We get { providerOrUrl, privateKey, contractAddress, contractAbi, contractOwner, timeout, txBaseUrl }
    const config = await loadConfigAsync(request.solution, request.network, request.version);

    // We get contract instance to effectively call the blockchain.
    const { contract, provider } = await getContractAsync(config);

    // We get the status of the job from the database
    // ? We need to know if we are running for the first time (registered) or if we are waiting for some results (running).
    var status = await getJobStatusAsync(request.jobId);
    log(status);

    switch (request.operation) {
      case "new":
        stateMachineResult = await blockchainCallNewAsync(request, config, contract, provider, status, stateMachineResult);
        break;
      case "transfer":
        stateMachineResult = await blockchainCallTransferAsync(request, config, contract, provider, status, stateMachineResult);
        break;
      case "list":
        stateMachineResult = await blockchainCallListAsync(request, stateMachineResult);
        break;
      default:
        throw new FatalError("Operation not supported");
    }
  } catch (error) {
    log(error);
    switch (error.constructor) {
      case FatalError: // ! Fatal error, there is no way to recover.
        // ? We mark the job as failed
        await updateJobStatusAsync(request.jobId, JobStatus.failed);
        // ? We return the status as FAILED and state machine will stop
        stateMachineResult.stateMachineStatus = "FAILED";
        stateMachineResult.stateMachineStatusMessage = error.message;
      default:
        // ! Non fatal error, we can retry
        break;
    }
  } finally {
    return stateMachineResult;
  }
}




