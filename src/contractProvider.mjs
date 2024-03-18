import { ethers } from "ethers";

import { log, FatalError } from "@blockchain-web-services/bws-library-node-common";

async function getContractAsync(config) {
  try {
    const providerOrUrl = config.providerOrUrl;
    const privateKey = config.privateKey;
    const contractAddress = config.contractAddress;
    const contractAbi = config.contractAbi;

    // Connect to the network
    const provider = new ethers.JsonRpcProvider(providerOrUrl);
    console.log(provider);

    // Create a signer
    let wallet = new ethers.Wallet(privateKey);
    let signer = wallet.connect(provider);

    // Create a contract instance
    let contract = new ethers.Contract(contractAddress, contractAbi, signer);

    //connect to the contrac. This is essential operation to interact with the contract.
    await contract.connect();

    return { contract, provider };
  } catch (e) {
    throw new Error(`Error in Establishing connection to the blockchain. ${e}`);
  }
}

// Export the function to use it in other files
export { getContractAsync };
