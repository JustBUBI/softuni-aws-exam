import * as cdk from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Alarm, ComparisonOperator, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Topic } from "aws-cdk-lib/aws-sns";
import {
  EmailSubscription,
  LambdaSubscription,
} from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import { BaseFunction } from "./function";

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
    const insertFunction = new BaseFunction(this, "insertFunction", {
      functionFileName: "insertFunction.ts",
      environment: {
        TABLE_NAME: productTable.tableName,
        TOPIC_ARN: thresholdReachedTopic.topicArn,
      },
    });
    const getProductFunction = new BaseFunction(this, "getProductFunction", {
      functionFileName: "getProductFunction.ts",
      environment: {
        TABLE_NAME: productTable.tableName,
      },
    });
    const deleteFunction = new BaseFunction(this, "deleteFunction", {
      functionFileName: "deleteFunction.ts",
      environment: {
        TABLE_NAME: productTable.tableName,
      },
    });
    // Grant lambdas permissions
    productTable.grantReadWriteData(insertFunction);
    productTable.grantReadData(getProductFunction);
    productTable.grantReadWriteData(deleteFunction);
    thresholdReachedTopic.grantPublish(insertFunction);

    // Create an SNS subscription to trigger the Lambda function
    thresholdReachedTopic.addSubscription(
      new LambdaSubscription(deleteFunction)
    );

    // Allow SNS to invoke the Lambda function
    deleteFunction.addPermission("AllowSNSInvoke", {
      principal: new ServicePrincipal("sns.amazonaws.com"),
      sourceArn: thresholdReachedTopic.topicArn,
    });

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
