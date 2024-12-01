import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

const region = "eu-central-1";
const dynamoClient = new DynamoDBClient({ region });

export const handler = async (event: any) => {
  console.log(event);

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
    body: "Item stored in Dynamo.",
  };
};
