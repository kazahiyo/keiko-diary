// tests/dynamodb-table-stack.test.ts
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import DynamoDbTableStack from "../../../lib/DynamoDb/DynamoDbTable";
import dynamoDbConfig from "../../../configs/dynamoDb.config"; // プロジェクト構成に合わせてパスを修正

describe("DynamoDbTableStack", () => {
  dynamoDbConfig.forEach((config) => {
    it(`should create DynamoDB Table '${config.tableName}' with correct properties`, () => {
      const app = new App();
      const stack = new DynamoDbTableStack(app, `${config.tableName}Stack`, { config });
      const template = Template.fromStack(stack);

      // テーブル名、課金モード、ポイントインタイムリカバリの検証
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: config.tableName,
        BillingMode: "PAY_PER_REQUEST",
        PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: false },
      });

      // パーティションキーの検証
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        KeySchema: Match.arrayWith([
          { AttributeName: config.tableProps.partitionKey.name, KeyType: "HASH" },
        ]),
      });

      // ソートキーが存在する場合はソートキーも検証
      if (config.tableProps.sortKey) {
        template.hasResourceProperties("AWS::DynamoDB::Table", {
          KeySchema: Match.arrayWith([
            { AttributeName: config.tableProps.sortKey.name, KeyType: "RANGE" },
          ]),
        });
      }

      // スナップショットテスト: テンプレート全体の状態を記録
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
});
