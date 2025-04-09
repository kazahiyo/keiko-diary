import {
  aws_cloudfront_origins,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib"; // AWS CDK の Stack クラスおよびスタックプロパティ型をインポート
import { Certificate, ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  Distribution,
  DistributionProps,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  BucketProps,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs"; // CDK の基本コンストラクトクラスをインポート
import { HostConfig } from "../../configs/model";

interface BucketDistributionStackProps extends StackProps {
  readonly config: HostConfig;
  readonly certificateArn: string;
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
  domainNames: string[],
  bucket: Bucket,
  certificate: ICertificate
): DistributionProps => ({
  defaultRootObject: "index.html",
  defaultBehavior: {
    origin:
      aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  certificate,
  domainNames,
});

export class BucketDistributionStack extends Stack {
  readonly bucket: Bucket; // 作成した S3 バケットリソースを保持するプロパティ
  readonly distribution: Distribution; // 作成した S3 バケットリソースを保持するプロパティ

  constructor(
    scope: Construct, // このスタックの親コンストラクト
    id: string, // スタックの一意な識別子（CloudFormation の論理IDに影響）
    props: BucketDistributionStackProps // スタックに渡される追加プロパティ（特に S3 設定情報）
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
    const logicalId = props.config.fqdn
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) // キャプチャグループは必ず存在する前提
      .replace(/^./, (m) => m.toUpperCase()); // 先頭文字を大文字化

    // S3 バケットリソースを作成
    // 第1引数: このスタックを親コンストラクトとして指定
    // 第2引数: 生成した論理ID（CloudFormation 内で一意なリソース識別子）
    // 第3引数: マージ済みの S3 バケットプロパティ
    this.bucket = new Bucket(this, `Bucket-${logicalId}`, bucketProps);

    const iCertificate = Certificate.fromCertificateArn(
      this,
      `Certificate-${logicalId}`,
      props.certificateArn
    );

    const domainNames: string[] = [
      props.config.fqdn,
      ...(props.config.altDomainNames || []), // サブドメイン名を追加
    ];

    // S3 バケットリソースを作成
    // 第1引数: このスタックを親コンストラクトとして指定
    // 第2引数: 生成した論理ID（CloudFormation 内で一意なリソース識別子）
    // 第3引数: マージ済みの S3 バケットプロパティ
    this.distribution = new Distribution(
      this,
      `Distribution-${logicalId}`,
      getDistributionProps(domainNames, this.bucket, iCertificate)
    );
  }
}
