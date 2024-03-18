// Description: 
//  downloadUrl : Download a file from a website and save it to S3
// Author: Nacho Coll

// use ES6 modules in Node.js
// https://nodejs.org/api/esm.html

// import the AWS SDK as a named import from client-s3  
//  https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/index.html

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { EventBridgeClient, PutEventsCommand, PutEventsRequestEntry } = require("@aws-sdk/client-eventbridge");

const randomUseragent = require('random-useragent');

async function writeToS3Async(buffer, ContentType, s3Bucket, s3Key) {
    const s3 = new S3Client();
    await s3.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: ContentType
    }));
    return `https://s3.amazonaws.com/${s3Bucket}/${s3Key}`;
}

async function sendMessageToQueue(message, queueUrl) {
    const sqs = new SQSClient();
    await sqs.send(new SendMessageCommand({
        MessageBody: message,
        QueueUrl: queueUrl
    })
    );
}

/*
 ? example of use:
 await sendEventBridgeMessageAsync({
        network : request.network,
        transactionHash: receipt.transactionHash
        }, 
        process.env.ENVIRONMENT + ".bws.smartcontract." + request.contract.split('.')[0].toLowerCase() + ".call",
        "bws.smartcontract.snapshot",
        request.contract   
      );
*/
async function sendEventBridgeMessageAsync(jsonMessage, eventBusName, source, detailType) {
    const eventBridge = new EventBridgeClient();
    await eventBridge.send(new PutEventsCommand({
        Entries: [{
            EventBusName: eventBusName,
            Source: source,
            DetailType: detailType,
            Detail: JSON.stringify(jsonMessage)
        }
        ]
    }));
}

export { writeToS3Async, sendMessageToQueue, sendEventBridgeMessageAsync };
