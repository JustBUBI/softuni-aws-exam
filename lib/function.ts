import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

type BaseFunctionProps = {
  functionFileName: string;
  environment?: {
    TABLE_NAME?: string;
    TOPIC_ARN?: string;
  };
};

export class BaseFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: BaseFunctionProps) {
    super(scope, id, {
      ...props,
      runtime: Runtime.NODEJS_20_X,
      entry: `${__dirname}/../src/${props.functionFileName}`,
      handler: "handler",
      environment: props.environment,
    });
  }
}