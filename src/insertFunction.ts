import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { randomUUID } from "crypto";

const region = "eu-central-1";
const dynamoClient = new DynamoDBClient({ region });
const snsClient = new SNSClient({ region });

export const handler = async (event: any) => {
  console.log(event);

  // Get the number of items in DynamoDB table
  try {
    const scanCommand = new ScanCommand({
      TableName: process.env.TABLE_NAME,
    });

    const scanResult = await dynamoClient.send(scanCommand);

    // Scan returns all items, count the length of Items array
    const itemCount = scanResult.Items ? scanResult.Items.length : 0;

    console.log(`Number of records in the table: ${itemCount}`);

    if (itemCount >= 10) {
      // Send email notification
      try {
        const snsCommand = new PublishCommand({
          Message: `Currently, there are ${itemCount} items in the database. This is above the allowed threshold!`,
          Subject: "Threshold for items in database reached!",
          TopicArn: process.env.TOPIC_ARN,
        });
        await snsClient.send(snsCommand);
        console.log(`Message sent to SNS.`);
      } catch (err) {
        console.error("Error triggering SNS:", err);
      }
    }
  } catch (err) {
    console.error("Error scanning DynamoDB:", err);
  }

  const dynamoItemInput = {
    TableName: process.env.TABLE_NAME,
    Item: {
      productId: {
        S: randomUUID(),
      },
      shortDescription: {
        S: "A versatile product",
      },
      tag: {
        S: "electronics",
      },
      cost: {
        N: (99.99).toString(),
      },
    },
  };

  // Save in Dynamo
  try {
    const dynamoInsertCommand = new PutItemCommand(dynamoItemInput);
    await dynamoClient.send(dynamoInsertCommand);
    console.log(`New item stored in Dynamo.`);
  } catch (err) {
    console.error("Error writing to Dynamo:", err);
  }

  return {
    statusCode: 200,
    body: "Request processed.",
  };
};
