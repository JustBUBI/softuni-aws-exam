import { DynamoDBClient, ScanCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const region = "eu-central-1";
const dynamoClient = new DynamoDBClient({ region });

export const handler = async (event: any) => {
  // Get the items in the DynamoDB table
  try {
    const scanCommand = new ScanCommand({
      TableName: process.env.TABLE_NAME,
    });

    const scanResult = await dynamoClient.send(scanCommand);

    // Check if there are at least 10 items
    if (!scanResult.Items || scanResult.Items.length < 10) {
      console.log("Not enough items to delete.");
      return {
        statusCode: 400,
        body: "Not enough items to delete.",
      };
    }

    const sortedItems = scanResult.Items.sort((a, b) => {
      const idA = a.productId?.S || "";
      const idB = b.productId?.S || "";
      return idA.localeCompare(idB);
    });

    // Get the last 10 items
    const lastTenItems = sortedItems.slice(-10);

    // Delete the last 10 items
    for (const item of lastTenItems) {
      const deleteCommand = new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          productId: item.productId,
        },
      });

      try {
        await dynamoClient.send(deleteCommand);
        console.log(`Item with productId ${item.productId.S} deleted.`);
      } catch (err) {
        console.error(`Failed to delete item with productId ${item.productId.S}`, err);
      }
    }

    return {
      statusCode: 200,
      body: "Successfully deleted the last 10 items.",
    };
  } catch (err) {
    console.error("Error scanning or deleting items:", err);

    return {
      statusCode: 500,
      body: "Failed to delete items from DynamoDB.",
    };
  }
};
