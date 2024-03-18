// Import the handler function from your Lambda function file
import { handler } from "../src/Blockchain-Call.mjs";

async function testHandler() {
  console.log("dasf");
  // Create a simulated event object with properties that match what the Lambda function expects
  const simulatedEvent = {
    detail: {
      Payload: {
        network: "mumbai", // or 'polygon', 'mumbai', etc.
        // Add other properties that you usually expect in the request object
        // For example:
        operation: "new",
        version: 1,
        bwsId: "someId",
        parameters: {
          name: "BWS NFT",
          description: "Moms first NFT.",
          image: "https://ipfs.io/ipfs/QmXPWc51xhFBYPm6kFXr9j7NsGxEWiK32juWDuNMYyt3no",
          attributes: [
            {
              trait_type: "Rarity",
              value: "Ultra rare",
            },
          ],
        },
      },
    },
    TaskResult: {
      Payload: {
        // Add properties that you usually expect in TaskResult.Payload object
        // For example:
        // count: 5,
      },
    },
    // ... other AWS event properties
  };

  // Create a simulated context object
  const simulatedContext = {
    // Your context properties here
    // Lambda context object is generally not used in simple use-cases
    // You can leave it empty for most applications
  };

  try {
    // Call the handler function and store the result
    const result = await handler(simulatedEvent, simulatedContext);

    // Print the result
    console.log("Handler result:", result);
  } catch (error) {
    // Print any errors
    console.error("Error calling handler:", error);
  }
}

// Run the test
testHandler();
