import {
  GlobalSecondaryIndexProps,
  LocalSecondaryIndexProps,
  TableProps,
} from "aws-cdk-lib/aws-dynamodb";

export interface DynamoDbTableConfig {
  tableName: string;
  tableProps: TableProps;
  gsi?: GlobalSecondaryIndexProps[];
  lsi?: LocalSecondaryIndexProps[];
  initJsonFile?: string | undefined;
  // initRecords?: { [key: string]: unknown }[];
}