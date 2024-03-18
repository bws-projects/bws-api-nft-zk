const StatesStatus = { RUNNING: "RUNNING", FAILED: "FAILED", COMPLETED: "COMPLETED" };

function loadStatesData(event, status) {
  return {
    stateMachineStatus: status,
    stateMachineStatusMessage: "",
    previousStateMachineStatus: event?.TaskResult?.Payload?.previousStateMachineStatus,
    // for call
    txHash: event?.TaskResult?.Payload?.txHash,
    nftIPFSHash: event?.TaskResult?.Payload?.nftIPFSHash,
    nftJson: event?.TaskResult?.Payload?.nftJson,
    // for estimate
    estimates: event?.TaskResult?.Payload?.estimates,
    // count to enable max retries
    count: event?.TaskResult?.Payload?.count !== undefined ? event.TaskResult.Payload.count + 1 : 1,
  };
}

export { StatesStatus, loadStatesData };
