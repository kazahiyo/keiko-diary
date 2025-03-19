import { Construct } from "constructs"; // Constructクラスをインポート
import { DynamoDbTableConfig } from "../../configs/txm.config.interface"; // DynamoDbTableConfigインターフェースをインポート
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib"; // AWS CDKの基本クラスとプロパティをインポート
import { BillingMode, Table } from "aws-cdk-lib/aws-dynamodb"; // DynamoDBのテーブルと課金モードをインポート

// DynamoDbTableStackPropsインターフェースを定義し、StackPropsを継承
interface DynamoDbTableStackProps extends StackProps {
  readonly config: DynamoDbTableConfig; // configプロパティを追加
}

// DynamoDbTableConfigからテーブルのプロパティを取得する関数を定義
const getTableProps = (config: DynamoDbTableConfig) => ({
  tableName: config.tableName, // テーブル名を設定
  partitionKey: config.tableProps.partitionKey, // パーティションキーを設定
  billingMode: BillingMode.PAY_PER_REQUEST, // 課金モードをオンデマンドに設定
  deletionProtection: false, // 削除保護を無効に設定
  pointInTimeRecovery: false, // 時点復旧を無効に設定
  removalPolicy: RemovalPolicy.DESTROY, // 削除ポリシーをDESTROYに設定
});

// DynamoDbTableStackクラスを定義し、Stackクラスを継承
export default class DynamoDbTableStack extends Stack {
  readonly table: Table; // tableプロパティを定義

  // コンストラクタを定義
  constructor(scope: Construct, id: string, props: DynamoDbTableStackProps) {
    super(scope, id, props); // 親クラスのコンストラクタを呼び出し

    // デフォルトのテーブルプロパティを取得
    const defaultTableProps = getTableProps(props.config);
    // デフォルトのテーブルプロパティと追加のプロパティをマージ
    const tableProps = { ...defaultTableProps, ...props.config.tableProps };

    // 新しいDynamoDBテーブルを作成
    const table = new Table(this, props.config.tableName, tableProps);
    this.table = table; // tableプロパティに作成したテーブルを設定
  }
}