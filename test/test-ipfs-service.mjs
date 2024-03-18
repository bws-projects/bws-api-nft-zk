// Import the handler function from your Lambda function file
import { uploadToIPFS } from "../src/ipfs-service.mjs";
import { loadConfig } from "../src/configProvider.mjs";

async function testHandler() {
  console.log("dasf");
  // Create a simulated event object with properties that match what the Lambda function expects

  try {
    const config = await loadConfig("nft", "mumbai", "v2");
    console.log("config: ", config);

    const nftMetadata = {
      name: "BWS NFT",
      description: "Moms first NFT.",
      image: "https://ipfs.io/ipfs/QmXPWc51xhFBYPm6kFXr9j7NsGxEWiK32juWDuNMYyt3no",
      attributes: [
        {
          trait_type: "Rarity",
          value: "Ultra rare",
        },
      ],
    };

    // Call the handler function and store the result
    const result = await uploadToIPFS(config, nftMetadata);

    // Print the result
    console.log("result:", result);
  } catch (error) {
    // Print any errors
    console.error("Error calling handler:", error);
  }
}

// Run the test
testHandler();
