import * as cdk from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Alarm, ComparisonOperator, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
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

    // CloudWatch Metric for the DynamoDB table's item count
    const itemCountMetric = productTable.metric("Table.ItemCount", {
      statistic: "Sum",
      period: cdk.Duration.minutes(1),
    });

    // CloudWatch Alarm
    const alarm = new Alarm(this, "ItemCountAlarm", {
      metric: itemCountMetric,
      // TODO: Change to 10
      threshold: 2,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // Add SNS Topic as Alarm Action
    alarm.addAlarmAction(new SnsAction(thresholdReachedTopic));

    // Lambda functions
    const insertFunction = new NodejsFunction(this, "insertFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: `${__dirname}/../src/insertFunction.ts`,
      handler: "handler",
      environment: {
        TABLE_NAME: productTable.tableName,
      },
    });
    const getProductFunction = new NodejsFunction(this, "getProductFunction", {
      runtime: Runtime.NODEJS_20_X,
      entry: `${__dirname}/../src/getProductFunction.ts`,
      handler: "handler",
      environment: {
        TABLE_NAME: productTable.tableName,
      },
    });
    // Grant lambdas permissions
    productTable.grantWriteData(insertFunction);
    productTable.grantReadData(getProductFunction);

    // EventBridge Rule to trigger the Lambda every 5 minutes
    new Rule(this, "ScheduleRule", {
      schedule: Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new LambdaFunction(insertFunction)],
    });

    // Api Gateway
    const api = new RestApi(this, "ProductApi");
    const resource = api.root.addResource("getProductById");
    resource.addMethod("POST", new LambdaIntegration(getProductFunction));

    // Outputs
    new cdk.CfnOutput(this, "TableArn", {
      value: productTable.tableArn,
      description: "ARN of the DynamoDB Product Table",
    });
    new cdk.CfnOutput(this, "RestApiEndpoint", {
      value: `https://${api.restApiId}.execute-api.eu-central-1.amazonaws.com/prod/getProductById`,
    });
  }
}
