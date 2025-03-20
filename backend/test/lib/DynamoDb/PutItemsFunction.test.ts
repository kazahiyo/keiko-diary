// tests/put-items-function-stack.test.ts
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as fs from "fs";
import * as path from "path";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import PutItemsFunctionStack from "../../../lib/DynamoDb/PutItemsFunction";
import { DynamoDbTableConfig } from "../../../configs/model"; // パスはプロジェクト構成に合わせて修正

describe("PutItemsFunctionStack", () => {
  // ダミーの初期データを含むJSONファイルを作成
  const dummyJsonContent = JSON.stringify([{ id: "1", value: "test" }]);
  const tempFilePath = path.join(__dirname, "dummy-data.json");

  beforeAll(() => {
    fs.writeFileSync(tempFilePath, dummyJsonContent, "utf8");
  });

  afterAll(() => {
    fs.unlinkSync(tempFilePath);
  });

  it("should create a custom resource to put items into the DynamoDB table", () => {
    // DynamoDbTableConfigのダミー設定
    const config: DynamoDbTableConfig = {
      tableName: "TestTable",
      tableProps: {
        partitionKey: { name: "id", type: AttributeType.STRING },
      },
      initJsonFile: tempFilePath,
    };

    const app = new App();
    const stack = new PutItemsFunctionStack(app, "TestPutItemsFunctionStack", { config });

    // 合成されたCloudFormationテンプレートを取得
    const template = Template.fromStack(stack);

    // AwsCustomResource (CloudFormation上は "Custom::AWS") が1件作成されていることを確認
    template.resourceCountIs("Custom::AWS", 1);

    // "Create" および "Update" プロパティに、BatchWriteItem のアクションが含まれていることを検証
    template.hasResourceProperties("Custom::AWS", {
      Create: Match.stringLikeRegexp('"action":"BatchWriteItem"'),
      Update: Match.stringLikeRegexp('"action":"BatchWriteItem"'),
    });

    // 物理リソースIDにテーブル名を含む名前が使われているかを確認
    template.hasResourceProperties("Custom::AWS", {
      Create: Match.stringLikeRegexp("CustomResource-TestTable-PutItemsFunction"),
    });

    // スナップショットテストの追加:
    // テンプレート全体をスナップショットとして保存し、将来の変更を検出できるようにする
    expect(template.toJSON()).toMatchSnapshot();
  });
});
