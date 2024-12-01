import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

const region = "eu-central-1";
const dynamoClient = new DynamoDBClient({ region });

export const handler = async (event: any) => {
  if (!event || !event.body) {
    return {
      statusCode: 400,
      body: "Bad request",
    };
  }
  
  const body = JSON.parse(event.body);
  const productId = body.productId;

  if (!productId) {
    return {
      statusCode: 400,
      body: "Product ID is required",
    };
  }

  try {
    const params = {
      TableName: process.env.TABLE_NAME,
      Key: {
        productId: { S: productId },
      },
    };

    const command = new GetItemCommand(params);
    const response = await dynamoClient.send(command);

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Item not found" }),
      };
    }

    const responseItem = response.Item;
    const item = {
        productId: responseItem.productId.S,
        shortDescription: responseItem.shortDescription.S,
        tag: responseItem.tag.S,
        cost: Number(responseItem.cost.N),
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ item }),
    };
  } catch (error) {
    console.error("Error fetching item:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
