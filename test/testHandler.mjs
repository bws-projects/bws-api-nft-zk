// Import the handler function from your Lambda function file
import { handler } from "../src/Blockchain-Estimate.mjs";

async function testHandler() {
  // Create a simulated event object with properties that match what the Lambda function expects
  const simulatedEvent = {
    detail: {
      Payload: {
        network: "mumbai", // or 'polygon', 'mumbai', etc.
        // Add other properties that you usually expect in the request object
        // For example:
        operation: "new",
        // bwsId: 'someId',
        parameters: {
          name: "testNFT",
          description: "THis is my nft description",
          image: "https://aisthisi.art/metadata/0.json",
          attributes: [
            {
              trait_type: "color",
              value: "blue",
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
