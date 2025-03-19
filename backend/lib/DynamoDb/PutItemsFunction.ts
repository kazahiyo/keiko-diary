import * as fs from "fs"; // ファイルシステムモジュールをインポート
import { Construct } from "constructs"; // Constructクラスをインポート
import { RetentionDays } from "aws-cdk-lib/aws-logs"; // ログの保持期間をインポート
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  AwsCustomResourceProps,
  AwsSdkCall,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources"; // カスタムリソース関連のクラスをインポート
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"; // AWS CDKの基本クラスとプロパティをインポート
import { DynamoDbTableConfig } from "../../configs/txm.config.interface"; // DynamoDbTableConfigインターフェースをインポート
import { BatchWriteItemCommandInput } from "@aws-sdk/client-dynamodb"; // DynamoDBのBatchWriteItemCommandInputをインポート
import { marshall } from "@aws-sdk/util-dynamodb"; // DynamoDBのmarshall関数をインポート

// CustomResourceStackPropsインターフェースを定義し、StackPropsを継承
interface CustomResourceStackProps extends StackProps {
  readonly config: DynamoDbTableConfig; // configプロパティを追加
}

// DynamoDbTableConfigからAWS SDKの呼び出し設定を取得する関数を定義
function getAwsSdkCallOnCreate(config: DynamoDbTableConfig) {
  const parameters: BatchWriteItemCommandInput = { RequestItems: undefined }; // BatchWriteItemCommandInputの初期値を設定
  if (config.initJsonFile) { // initJsonFileが設定されている場合
    parameters.RequestItems = {}; // RequestItemsを初期化
    const items = fs.readFileSync(config.initJsonFile, "utf8"); // JSONファイルを読み込む
    const records = JSON.parse(items) as Record<string, unknown>[]; // JSONをパースしてレコードの配列に変換
    const marshalledRecords = marshall(records);
    parameters.RequestItems[config.tableName] = []; // テーブル名をキーにRequestItemsを初期化
    for (const record of marshalledRecords) { // 各レコードに対して
      const putRequest = { PutRequest: { Item: {} } }; // PutRequestを初期化
      putRequest.PutRequest.Item = record; // レコードをPutRequestに設定
      parameters.RequestItems[config.tableName].push(putRequest); // RequestItemsにPutRequestを追加
    }
  }

  const onCreateProps: AwsSdkCall = {
    service: "DynamoDB", // サービス名を設定
    action: "BatchWriteItem", // アクション名を設定
    parameters, // パラメータを設定
    physicalResourceId: PhysicalResourceId.of(
      `CustomResource-${config.tableName}-PutItemsFunction`
    ), // 物理リソースIDを設定
  };
  return onCreateProps; // AwsSdkCallを返す
}

// DynamoDbTableConfigからカスタムリソースのプロパティを取得する関数を定義
function getCustomResourceProps(config: DynamoDbTableConfig) {
  const customResourceProps: AwsCustomResourceProps = {
    functionName: `CustomResource-${config.tableName}-PutItemsFunction`, // 関数名を設定
    installLatestAwsSdk: true, // 最新のAWS SDKをインストール
    logRetention: RetentionDays.ONE_DAY, // ログの保持期間を1日に設定
    removalPolicy: RemovalPolicy.DESTROY, // 削除ポリシーをDESTROYに設定
    onCreate: getAwsSdkCallOnCreate(config), // 作成時のAWS SDK呼び出しを設定
    onUpdate: getAwsSdkCallOnCreate(config), // 更新時のAWS SDK呼び出しを設定
    policy: AwsCustomResourcePolicy.fromSdkCalls({
      resources: AwsCustomResourcePolicy.ANY_RESOURCE, // 任意のリソースに対するポリシーを設定
    }),
  };
  return customResourceProps; // AwsCustomResourcePropsを返す
}

// PutItemsFunctionStackクラスを定義し、Stackクラスを継承
export default class PutItemsFunctionStack extends Stack {
  constructor(scope: Construct, id: string, props: CustomResourceStackProps) {
    super(scope, id, props); // 親クラスのコンストラクタを呼び出し

    // カスタムリソースを作成し、DynamoDBテーブルにアイテムを追加
    const putItemsToBlockchainConfigTableFunction = new AwsCustomResource(
      this,
      `CustomResource-${props.config.tableName}-PutItemsFunction`,
      getCustomResourceProps(props.config)
    );
  }
}
