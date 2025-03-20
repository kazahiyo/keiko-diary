import {
  AttributeType,
  TableProps,
  GlobalSecondaryIndexProps,
  LocalSecondaryIndexProps,
} from "aws-cdk-lib/aws-dynamodb";
import { join } from "path";
import { DynamoDbTableConfig } from "./model";

const dynamoDbConfig: DynamoDbTableConfig[] = [
  {
    tableName: "Waza",
    tableProps: {
      partitionKey: {
        name: "tori",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "uke",
        type: AttributeType.STRING,
      },
    },
    initJsonFile: join(`${__dirname}`, "../../", "backend/lib/DynamoDb/Waza.json"),
  },
  {
    tableName: "User",
    tableProps: {
      partitionKey: {
        name: "userId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "dojo",
        type: AttributeType.STRING,
      },
    },
    initJsonFile: join(`${__dirname}`, "../../", "backend/lib/DynamoDb/DummyUser.json"),
  },
  {
    tableName: "Diary",
    tableProps: {
      partitionKey: {
        name: "userId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "date",
        type: AttributeType.STRING,
      },
    },
    initJsonFile: join(
      `${__dirname}`,
      "../../",
      "backend/lib/DynamoDb/DummyDiary.json"
    ),
  },
  {
    tableName: "Dojo",
    tableProps: {
      partitionKey: {
        name: "dojoId",
        type: AttributeType.STRING,
      },
    },
    initJsonFile: join(`${__dirname}`, "../../", "backend/lib/DynamoDb/Dojo.json"),
  },
];

export default dynamoDbConfig;
