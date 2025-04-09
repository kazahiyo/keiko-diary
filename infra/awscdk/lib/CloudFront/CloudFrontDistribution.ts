import {
  aws_cloudfront_origins,
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
  Bucket,
  IBucket,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs"; // CDK の基本コンストラクトクラスをインポート
import { HostConfig } from "../../configs/model";

interface CloudFrontDistributionStackProps extends StackProps {
  readonly config: HostConfig;
  readonly certificateArn: string;
  readonly bucketArn: string;
}

const getDistributionProps = (
  domainName: string,
  bucket: IBucket,
  certificate: ICertificate
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

export class CloudFrontDistribution extends Stack {
  readonly distribution: Distribution; // 作成した S3 バケットリソースを保持するプロパティ

  constructor(
    scope: Construct, // このスタックの親コンストラクト
    id: string, // スタックの一意な識別子（CloudFormation の論理IDに影響）
    props: CloudFrontDistributionStackProps // スタックに渡される追加プロパティ（特に S3 設定情報）
  ) {
    super(scope, id, props); // 親クラス Stack のコンストラクタを呼び出し

    // CloudFormation で使用する論理IDを、バケット名から生成
    // 非英数字を削除し、続く文字を大文字化することで PascalCase 形式に変換
    const logicalId = props.config.fqdn
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) // キャプチャグループは必ず存在する前提
      .replace(/^./, (m) => m.toUpperCase()); // 先頭文字を大文字化

    const iCertificate = Certificate.fromCertificateArn(
      this,
      `Certificate-${logicalId}`,
      props.certificateArn
    );
    const iBucket = Bucket.fromBucketArn(
      this,
      `Bucket-${logicalId}`,
      props.bucketArn
    );

    // S3 バケットリソースを作成
    // 第1引数: このスタックを親コンストラクトとして指定
    // 第2引数: 生成した論理ID（CloudFormation 内で一意なリソース識別子）
    // 第3引数: マージ済みの S3 バケットプロパティ
    this.distribution = new Distribution(
      this,
      `Distribution-${logicalId}`,
      getDistributionProps(props.config.fqdn, iBucket, iCertificate)
    );
  }
}
