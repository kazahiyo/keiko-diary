// test/BucketDistributionStack.test.ts
import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { BucketDistributionStack } from "../../../lib/S3CloudFront/BucketDistribution"; // パスはプロジェクト構成に合わせて調整
import { BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";

// HostConfig の型（スタックコードで利用している構造に合わせる）
interface TestHostConfig {
  fqdn: string;
  createReource: boolean;
  s3: {
    bucket: {
      bucketProps: {
        bucketName: string;
        versioned: boolean;
        removalPolicy: RemovalPolicy;
        autoDeleteObjects: boolean;
        blockPublicAccess: any;
        encryption: BucketEncryption;
      };
    };
  };
  cloudFront: {};
  route53: {};
}

describe("BucketDistributionARecordStack", () => {
  let app: App;
  let certificateArn: string;

  // ベースとなる有効な設定情報
  const baseConfig: TestHostConfig = {
    fqdn: "www.keiko-diary.com",
    createReource: true,
    s3: {
      bucket: {
        bucketProps: {
          bucketName: "www-keiko-diary.com",
          versioned: false,
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          encryption: BucketEncryption.S3_MANAGED,
        },
      },
    },
    cloudFront: {},
    route53: {},
  };

  beforeEach(() => {
    app = new App();
    // ダミーの ACM 証明書（us-east-1 に存在している必要があります）
    certificateArn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012";
  })
  it("creates an S3 bucket with default configuration", () => {
    const stack = new BucketDistributionStack(app, "DefaultStack", {
      config: baseConfig,
      certificateArn,
    });
    const template = Template.fromStack(stack);

    // S3 バケットの論理IDは、バケット名 "www.keiko-diary.com" から "Bucket-WwwKeikoDiaryCom" となるはず
    const expectedBucketLogicalId = "Bucket-WwwKeikoDiaryCom";
    expect(stack.node.tryFindChild(expectedBucketLogicalId)).toBeDefined();

    // S3 バケットのプロパティが正しく設定されているか検証
    // BucketName はトークンの場合もあるため、Match.stringLikeRegexp を利用
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: Match.stringLikeRegexp("www-keiko-diary.com"),
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
    });
  });

  it("merges additional bucketProps from config", () => {
    // カスタム設定によりバケットプロパティの上書き動作を検証
    const customBucketProps = {
      bucketName: "custom-keiko-diary.com", // 上書きされたバケット名
      versioned: true, // バージョニングを有効化
      removalPolicy: RemovalPolicy.RETAIN, // 削除ポリシーの上書き
      autoDeleteObjects: false, // オブジェクト自動削除を無効化
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    };

    const customConfig: TestHostConfig = {
      fqdn: "custom.keiko-diary.com",
      createReource: true,
      s3: {
        bucket: {
          bucketProps: customBucketProps,
        },
      },
      cloudFront: {},
      route53: {},
    };

    const stack = new BucketDistributionStack(app, "CustomStack", {
      config: customConfig,
      certificateArn,
    });
    const template = Template.fromStack(stack);

    // 論理IDは "custom-keiko-diary.com" から "Bucket-CustomKeikoDiaryCom" となるはず
    const expectedBucketLogicalId = "Bucket-CustomKeikoDiaryCom";
    expect(stack.node.tryFindChild(expectedBucketLogicalId)).toBeDefined();

    // カスタム設定が反映されているか（バケット名およびバージョニング設定）
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: Match.stringLikeRegexp("custom-keiko-diary.com"),
      VersioningConfiguration: {
        Status: "Enabled",
      },
    });
  });

  it("creates a CloudFront distribution with correct domain name and certificate", () => {
    const stack = new BucketDistributionStack(app, "DistributionStack", {
      config: baseConfig,
      certificateArn,
    });
    const template = Template.fromStack(stack);

    // CloudFront の論理IDは、fqdn "www.keiko-diary.com" から "Distribution-WwwKeikoDiaryCom" となるはず
    const expectedDistributionLogicalId = "Distribution-WwwKeikoDiaryCom";
    expect(
      stack.node.tryFindChild(expectedDistributionLogicalId)
    ).toBeDefined();

    // CloudFront Distribution のプロパティが正しく設定されているか検証
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: Match.arrayWith(["www.keiko-diary.com"]),
        DefaultRootObject: "index.html",
        DefaultCacheBehavior: {
          ViewerProtocolPolicy: "redirect-to-https",
        },
      },
    });
  });


  it("matches the CloudFormation template snapshot", () => {
    const stack = new BucketDistributionStack(app, "SnapshotStack", {
      config: baseConfig,
      certificateArn,
    });
    const template = Template.fromStack(stack).toJSON();
    expect(template).toMatchSnapshot();
  });
});
