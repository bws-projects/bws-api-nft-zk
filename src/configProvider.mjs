import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import path from "path";
import * as fs from "fs";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

/* BWS node Libraries */
import { log, FatalError } from "@blockchain-web-services/bws-library-node-common";
import { getContractAddressAsync } from "@blockchain-web-services/bws-library-node-data";
/**********************/

let config = {
  providerOrUrl: null,
  privateKey: null,
  contractAddress: null,
  contractAbi: null,
  contractOwner: null,
  timeout: null,
  txBaseUrl: null,
  gas_increase_num: null,
  ipfs_base_url: null,
  ipfs_endpoint: null,
  ipfs_key: null,
  ipfs_api_secret_key: null,
};

async function loadConfigAsync(solution, network, version) {
  try {

    /* AWS Accounts, staging and prod */
    if (process.env.ENVIRONMENT === "staging" || process.env.ENVIRONMENT === "prod") {
      const secretsManagerClient = new SecretsManagerClient();

      // TODO: move some to ENVIRONMENT variables defined at DEPLOY time but encrypted (for cost savings)

      /* we get network secrets from AWS Secrets Manager */
      const ethereumSecrets = await secretsManagerClient.send(
        new GetSecretValueCommand({
          SecretId: "ethereum/networks",
        })
      );
      const parsedNetworkSecrets = JSON.parse(ethereumSecrets.SecretString);

      config.contractOwner = parsedNetworkSecrets[`${network}.address`];
      config.privateKey = parsedNetworkSecrets[`${network}.key`];
      config.providerOrUrl = parsedNetworkSecrets[`${network}.endpoint`];
      config.txBaseUrl = parsedNetworkSecrets[`${network}.txurl`];


      /* we get IPFS secrets from AWS Secrets Manager */
      const IPFSSecrets = await secretsManagerClient.send(
        new GetSecretValueCommand({
          SecretId: "pinata/keys",
        })
      );
      const parsedIPFSSecrets = JSON.parse(IPFSSecrets.SecretString);

      config.ipfs_endpoint = parsedIPFSSecrets["endpoint"];
      config.ipfs_key = parsedIPFSSecrets["key"];
      config.ipfs_api_secret_key = parsedIPFSSecrets["secret"];
      config.ipfs_base_url = process.env.IPFS_BASE_URL ? process.env.IPFS_BASE_URL : "https://gateway.pinata.cloud/ipfs/";

      /* we get contract address from DynamoDB */
      config.contractAddress = await getContractAddressAsync(solution, network, version);

      /* we get contract abi from file system */
      config.contractAbi = JSON.parse(fs.readFileSync(path.join(process.env.LAMBDA_TASK_ROOT, "abis/" + network + '/' + config.contractAddress + '/contract.abi')));

      /* we get contract call timeout from lambda environment variables */
      config.timeout = process.env.TIME_OUT ? process.env.TIME_OUT : 1000;

      /* we get gas increase number from lambda environment variables */
      config.gas_increase_num = process.env.GAS_INCREASE_NUM ? process.env.GAS_INCREASE_NUM : 100000;

    } else {
      /* local testing, using .env file and abi local file */
      config.contractAbi = JSON.parse(
        fs.readFileSync(path.join(process.env.LAMBDA_TASK_ROOT, "abi/" + network + "/contract.abi"))
      );

      config.contractAddress = process.env.CONTRACT_ADDRESS;
      config.providerOrUrl = process.env.RPC_URL;
      config.privateKey = process.env.WALLET_KEY;
      config.contractOwner = process.env.CONTRACT_OWNER;
      config.timeout = process.env.TIME_OUT;
      config.txBaseUrl = process.env.TX_BASE_URL;

      config.gas_increase_num = process.env.GAS_INCREASE_NUM;
      config.ipfs_endpoint = process.env.IPFS_SERVICE_ENDPOINT;
      config.ipfs_key = process.env.IPFS_KEY;
      config.ipfs_api_secret_key = process.env.IPFS_API_SECRET_KEY;
      config.ipfs_base_url = process.env.IPFS_BASE_URL;
    }
    //

    return config;
  } catch (error) {
    throw new FatalError(`Error in loadConfigAsync ${error}`);
  }
}

export { loadConfigAsync };
