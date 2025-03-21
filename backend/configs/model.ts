import {
  GlobalSecondaryIndexProps,
  LocalSecondaryIndexProps,
  TableProps,
} from "aws-cdk-lib/aws-dynamodb";
import { PolicyStatementProps } from "aws-cdk-lib/aws-iam";
import { FunctionProps } from "aws-cdk-lib/aws-lambda";

export interface DynamoDbTableConfig {
  tableName: string;
  tableProps: TableProps;
  gsi?: GlobalSecondaryIndexProps[];
  lsi?: LocalSecondaryIndexProps[];
  initJsonFile?: string | undefined;
  // initRecords?: { [key: string]: unknown }[];
}

export interface LambdaConfig {
  functionName: string;
  functionProps?: FunctionProps | undefined;
  policyStatementProps?: PolicyStatementProps;
  requieredLayerName: string[];
}
