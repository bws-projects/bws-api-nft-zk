# BWS API Handling for BWS.NFT.zK Solution

This repo is responsible to handle BWS.NFT.zK 'call' and 'estimate' API calls.

## devops.yml

! This is already configured and you usually don't need to modify. 

This file defines the repo deployment pipeline into AWS accounts. The pipeline calls .deploy/.build/code.yml and then deploys everything using .deploy/.IaC/node-lambdas/node-lambdas.yml.


## .deploy/.build/code.yml

! This is already configured and you usually don't need to modify. 

This script is responsible for:

- adding/updating to BWS_BLOCKCHAIN_CONTRACTS DynamoDB table the solution Smart Contract addresses for all networks in use.
- building the code (lambdas)
- testing (currently deactivated - we use localstack)

## .deploy/.IaC/node-lambas

! This is already configured and you usually don't need to modify. 

Cloudformation defining:

- AWS::Serverless::Function for 'call' operation
- AWS::Serverless::Function for 'estimate' operation
- AWS::StepFunctions::StateMachine to handle 'call' operation workflow
- AWS::StepFunctions::StateMachine to handle 'estimate' operation workflow
- AWS::Events::Rule (one per Step Function) to listen for solution call and estimate requests (and call the related state machine workflow)

## src/node/lambdas

Node project containing 2 lambda handler:

### Blockchain-Estimate

! This operation does not update any database table.

Handles BWS API 'estimate' for the solution and must return 'estimates' JSON as part of the function return object:

```json
{
    request: "<JSON input request>",
    stateMachineStatus: "<state machine function call result (e.g. RUNNING, FAILED, COMPLETED)>",
    stateMachineStatusMessage: "<message if error>",
    count: "<iteration count to enable failure in case of too many retries>"
    estimates:{
        estimatedGas: 0,
        estimatedInNetworkCurrency: 0,
        networkCurrencyPrice: 0,
        usd: 0
    }
}
```

### Blockchain-Call

! This operation MUST update smart contract call results into BWS_BLOCKCHAIN_JOBS DynamoDB Table.

PENDING.

