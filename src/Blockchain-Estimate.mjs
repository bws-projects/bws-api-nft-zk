import { log, FatalError } from "@blockchain-web-services/bws-library-node-common";

import { StatesStatus, loadStatesData } from "./@bws-lib/states.mjs";

import { loadConfigAsync } from "./configProvider.mjs";
import { getContractAsync } from "./contractProvider.mjs";
import { validateRequest, getContractCallEstimatesAsync } from "./common.mjs";



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

  /* https://docs.bws.ninja/solutions/bws.nft.zk/ */
  var request = event.detail.Payload;

  /* We validate the request */
  validateRequest(request);

  /* We load the state machine data and set status to RUNNING */
  var stateMachineResult = loadStatesData(event, StatesStatus.RUNNING);

  try {

    // We get { providerOrUrl, privateKey, contractAddress, contractAbi, contractOwner, timeout, txBaseUrl } 
    const config = await loadConfigAsync(request.solution, request.network, request.version);

    // We get contract instance to effectively call the blockchain.
    const { contract, provider } = await getContractAsync(config);

    // We estimate the contract call
    stateMachineResult.estimates = await getContractCallEstimatesAsync(contract, request, provider);

    stateMachineResult.stateMachineStatus = "FINISHED";
  } catch (error) {
    log(error);
    stateMachineResult.stateMachineStatus = "FAILED";
    stateMachineResult.stateMachineStatusMessage = error.message;
  } finally {
    return stateMachineResult;
  }
}
