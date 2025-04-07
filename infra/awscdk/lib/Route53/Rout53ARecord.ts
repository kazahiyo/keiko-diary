import { Stack, StackProps } from "aws-cdk-lib"; // AWS CDKのStackクラスとStackProps型をインポート
import { Construct } from "constructs"; // CDKリソースの基本単位であるConstructをインポート
import {
  ARecord,
  ARecordProps,
  PublicHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53"; // Route53のAレコード、プロパティ型、パブリックホストゾーン、レコードターゲットをインポート
import { Distribution } from "aws-cdk-lib/aws-cloudfront"; // CloudFrontディストリビューションの型をインポート
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets"; // CloudFrontをターゲットとするRoute53エイリアスレコード用のターゲットをインポート

// Route53ARecordStackPropsインターフェース
// StackPropsに加えて、パブリックホストゾーンとCloudFrontディストリビューションの情報を必須とする
interface Route53ARecordStackProps extends StackProps {
  readonly publicHostedZone: PublicHostedZone; // 対象のパブリックホストゾーン
  readonly distribution: Distribution;         // 対象のCloudFrontディストリビューション
}

// ARecordリソース作成に必要なプロパティ(ARecordProps)を生成するヘルパー関数
const getARecordProps = (
  publicHostedZone: PublicHostedZone,
  distribution: Distribution // 対象のCloudFrontディストリビューションを指定
): ARecordProps => ({
  target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)), // CloudFrontディストリビューションをエイリアスターゲットとして設定
  zone: publicHostedZone, // 対象のパブリックホストゾーンを指定
  recordName: distribution.domainName, // レコード名をホストゾーンのドメイン名に設定
  comment: `ARecord for ${distribution.domainName}`, // コメントを設定
});

// Route53ARecordStackクラス（AWS CDKのStackを継承）
// ARecordリソースを作成し、Route53に登録するスタック
export class Route53ARecordStack extends Stack {
  readonly aRecord: ARecord; // 作成したARecordリソースを保持する読み取り専用プロパティ

  // コンストラクタ：スタックの初期化およびARecordリソースの作成を行う
  constructor(
    scope: Construct, // このスタックの親コンストラクト（例: アプリケーションのルート）
    id: string,      // スタックの一意な識別子（CloudFormation上の論理IDに影響）
    props: Route53ARecordStackProps // 追加のプロパティ（パブリックホストゾーンとディストリビューション情報を含む）
  ) {
    super(scope, id, props); // 親クラスStackのコンストラクタを呼び出して初期化

    // パブリックホストゾーンとディストリビューションからARecordリソースに必要なプロパティを生成
    const defaultARecordProps = getARecordProps(
      props.publicHostedZone,
      props.distribution
    );

    // CloudFormationで使用する論理IDをホストゾーンのドメイン名から生成する
    // ・アスタリスク(*)は "Astr" に置換
    // ・その他の非英数字部分は削除し、直後の文字を大文字化してPascalCase形式に整形
    const logicalId = props.publicHostedZone.zoneName
      .replace(/\*/g, "Astr")
      .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^./, (m) => m.toUpperCase());

    // ARecordリソースを作成
    // ・第1引数: このスタックを親コンストラクトとして指定
    // ・第2引数: 生成した論理ID（CloudFormation内で一意なリソース識別子）
    // ・第3引数: 生成したARecordのプロパティ
    this.aRecord = new ARecord(
      this,
      `ARecord-${logicalId}`,
      defaultARecordProps
    );
  }
}
