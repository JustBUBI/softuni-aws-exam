import * as cdk from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export class SoftuniAwsExamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table
    const productTable = new Table(this, "ProductTable", {
      tableName: "ProductTable",
      partitionKey: { name: "productId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
    // Add global secondary index to query by tag
    productTable.addGlobalSecondaryIndex({
      indexName: "TagIndex",
      partitionKey: { name: "tag", type: AttributeType.STRING },
    });

    // SNS topic
    const thresholdReachedTopic = new Topic(this, "ThresholdReachedTopic", {
      displayName: "ThresholdReachedTopic",
    });
    // TODO: Change email to: hristo.zhelev@yahoo.com.
    thresholdReachedTopic.addSubscription(
      new EmailSubscription("lyubomir555@gmail.com")
    );

    // Outputs
    new cdk.CfnOutput(this, "TableArn", {
      value: productTable.tableArn,
      description: "ARN of the DynamoDB Product Table",
    });
  }
}
