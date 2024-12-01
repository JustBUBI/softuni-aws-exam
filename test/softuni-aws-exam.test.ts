import * as cdk from "aws-cdk-lib";
import * as SoftuniAwsExamStack from "../lib/softuni-aws-exam-stack";
import "jest-cdk-snapshot";

test("Stack Created", () => {
  const app = new cdk.App();
  const stack = new SoftuniAwsExamStack.SoftuniAwsExamStack(app, "MyTestStack");
  expect(stack).toMatchCdkSnapshot();
});
