import {
  aws_cloudfront_origins,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib"; // AWS CDK の Stack クラスおよびスタックプロパティ型をインポート
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  Distribution,
  DistributionProps,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import {
  ARecord,
  ARecordProps,
  PublicHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  BucketProps,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs"; // CDK の基本コンストラクトクラスをインポート
import { HostConfig } from "../../configs/model";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { config } from "process";

interface BucketDistributionARecordStackProps extends StackProps {
  readonly config: HostConfig;
  readonly certificate: Certificate;
  readonly publicHostedZone: PublicHostedZone;
}

const getBucketProps = (
  config: BucketProps // S3 バケットの設定情報を受け取る
): BucketProps => ({
  bucketName: config.bucketName, // バケット名を設定
  versioned: false, // バージョニングは無効化
  removalPolicy: RemovalPolicy.DESTROY, // スタック削除時にバケットを削除
  autoDeleteObjects: true, // バケット削除時にオブジェクトも自動削除
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // 公開アクセスを全てブロック
  encryption: BucketEncryption.S3_MANAGED, // S3 管理の暗号化を利用
});
/**
 * 指定された設定情報から S3 バケット用のプロパティを生成する
 */

const getDistributionProps = (
  domainName: string,
  bucket: Bucket,
  certificate: Certificate
): DistributionProps => ({
  defaultRootObject: "index.html",
  defaultBehavior: {
    origin:
      aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  certificate,
  domainNames: [domainName],
});

// ARecordリソース作成に必要なプロパティ(ARecordProps)を生成するヘルパー関数
const getARecordProps = (
  recordName: string, // レコード名を指定
  publicHostedZone: PublicHostedZone,
  distribution: Distribution // 対象のCloudFrontディストリビューションを指定
): ARecordProps => ({
  target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)), // CloudFrontディストリビューションをエイリアスターゲットとして設定
  zone: publicHostedZone, // 対象のパブリックホストゾーンを指定
  recordName, // レコード名をホストゾーンのドメイン名に設定
  comment: `ARecord for ${distribution.domainName}`, // コメントを設定
});

export class BucketDistributionARecordStack extends Stack {
  readonly bucket: Bucket; // 作成した S3 バケットリソースを保持するプロパティ
  readonly distribution: Distribution; // 作成した S3 バケットリソースを保持するプロパティ
  readonly aRecord: ARecord; // 作成した A レコードリソースを保持するプロパティ

  constructor(
    scope: Construct, // このスタックの親コンストラクト
    id: string, // スタックの一意な識別子（CloudFormation の論理IDに影響）
    props: BucketDistributionARecordStackProps // スタックに渡される追加プロパティ（特に S3 設定情報）
  ) {
    super(scope, id, props); // 親クラス Stack のコンストラクタを呼び出し

    const defaultBucketProps = getBucketProps(
      props.config.s3.bucket.bucketProps
    );

    // デフォルトのプロパティと、設定ファイルで指定されたプロパティをマージする
    const bucketProps = {
      ...defaultBucketProps, // 生成されたデフォルト設定
      ...props.config.s3.bucket.bucketProps, // 設定ファイルで上書きまたは追加された設定
    };

    // CloudFormation で使用する論理IDを、バケット名から生成
    // 非英数字を削除し、続く文字を大文字化することで PascalCase 形式に変換
    const bucketLogicalId = props.config.s3.bucket.bucketProps
      .bucketName!.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) // キャプチャグループは必ず存在する前提
      .replace(/^./, (m) => m.toUpperCase()); // 先頭文字を大文字化

    // S3 バケットリソースを作成
    // 第1引数: このスタックを親コンストラクトとして指定
    // 第2引数: 生成した論理ID（CloudFormation 内で一意なリソース識別子）
    // 第3引数: マージ済みの S3 バケットプロパティ
    this.bucket = new Bucket(this, `S3Bucket-${bucketLogicalId}`, bucketProps);

    // CloudFormation で使用する論理IDを、バケット名から生成
    // 非英数字を削除し、続く文字を大文字化することで PascalCase 形式に変換
    const distributionLogicalId = props.config.fqdn
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) // キャプチャグループは必ず存在する前提
      .replace(/^./, (m) => m.toUpperCase()); // 先頭文字を大文字化

    // S3 バケットリソースを作成
    // 第1引数: このスタックを親コンストラクトとして指定
    // 第2引数: 生成した論理ID（CloudFormation 内で一意なリソース識別子）
    // 第3引数: マージ済みの S3 バケットプロパティ
    this.distribution = new Distribution(
      this,
      `Distribution-${distributionLogicalId}`,
      getDistributionProps(props.config.fqdn, this.bucket, props.certificate)
    );

    const aRecordProps = getARecordProps(
      props.config.fqdn,
      props.publicHostedZone,
      this.distribution
    );

    const aRecordLogicalId = props.publicHostedZone.zoneName
      .replace(/\*/g, "Astr")
      .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^./, (m) => m.toUpperCase());

    // ARecordリソースを作成
    // ・第1引数: このスタックを親コンストラクトとして指定
    // ・第2引数: 生成した論理ID（CloudFormation内で一意なリソース識別子）
    // ・第3引数: 生成したARecordのプロパティ
    this.aRecord = new ARecord(
      this,
      `ARecord-${aRecordLogicalId}`,
      aRecordProps
    );
  }
}
