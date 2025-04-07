// test/BucketDistributionStack.test.ts
import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { BucketDistributionARecordStack } from "../../../lib/S3CloudFrontRoute53/BucketDistributionARecord"; // パスはプロジェクト構成に合わせて調整
import { BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { PublicHostedZone } from "aws-cdk-lib/aws-route53";

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
  let certificateStack: Stack;
  let certificate: Certificate;
  let dummyPublicHostedZoneStack: Stack;
  let dummyPublicHostedZone: PublicHostedZone;

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
    certificateStack = new Stack(app, "CertificateStack");
    certificate = new Certificate(certificateStack, "DummyCertificate", {
      domainName: "keiko-diary.com",
      subjectAlternativeNames: ["*.keiko-diary.com"],
    });

    // ダミーの PublicHostedZone を作成
    dummyPublicHostedZoneStack = new Stack(app, "DummyHostedZoneStack");
    dummyPublicHostedZone = new PublicHostedZone(
      dummyPublicHostedZoneStack,
      "DummyZone",
      {
        zoneName: "keiko-diary.com-",
      }
    );
  });

  it("creates an S3 bucket with default configuration", () => {
    const stack = new BucketDistributionARecordStack(app, "DefaultStack", {
      config: baseConfig,
      certificate,
      publicHostedZone: dummyPublicHostedZone,
    });
    const template = Template.fromStack(stack);

    // S3 バケットの論理IDは、バケット名 "www.keiko-diary.com" から "S3Bucket-WwwKeikoDiaryCom" となるはず
    const expectedBucketLogicalId = "S3Bucket-WwwKeikoDiaryCom";
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

    const stack = new BucketDistributionARecordStack(app, "CustomStack", {
      config: customConfig,
      certificate,
      publicHostedZone: dummyPublicHostedZone,
    });
    const template = Template.fromStack(stack);

    // 論理IDは "custom-keiko-diary.com" から "S3Bucket-CustomKeikoDiaryCom" となるはず
    const expectedBucketLogicalId = "S3Bucket-CustomKeikoDiaryCom";
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
    const stack = new BucketDistributionARecordStack(app, "DistributionStack", {
      config: baseConfig,
      certificate,
      publicHostedZone: dummyPublicHostedZone,
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

  it("creates an ARecord with correct properties", () => {

    const altConfig: TestHostConfig = {
      fqdn: "-www.keiko-diary.com-",
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

    const stack = new BucketDistributionARecordStack(app, "ARecordStack", {
      config: altConfig,
      certificate,
      publicHostedZone: dummyPublicHostedZone,
    });
    const template = Template.fromStack(stack);

    // ARecord の論理IDは、パブリックホストゾーンの zoneName から生成される
    const expectedARecordLogicalId = `ARecord-${dummyPublicHostedZone.zoneName
      .replace(/\*/g, "Astr")
      .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^./, (m) => m.toUpperCase())}`;
    expect(stack.node.tryFindChild(expectedARecordLogicalId)).toBeDefined();

    // ARecord のプロパティとして、recordName と comment が正しく設定されているか検証
    // distribution.domainName はトークンになっているため、実際の文字列は生成される CloudFront のドメイン名（例: dxxxxx.cloudfront.net）となるはず

    template.hasResourceProperties("AWS::Route53::RecordSet", {
      AliasTarget: {
        DNSName: {
          "Fn::GetAtt": Match.arrayWith([
            // Distribution の論理IDは "Distribution-WwwKeikoDiaryCom" となっているはず
            Match.stringLikeRegexp("DistributionWwwKeikoDiaryCom"),
            "DomainName",
          ]),
        },
      },
    });
  });

  // it("matches the CloudFormation template snapshot", () => {
  //   const stack = new BucketDistributionARecordStack(app, "SnapshotStack", {
  //     config: baseConfig,
  //     certificate,
  //     publicHostedZone: dummyPublicHostedZone,
  //   });
  //   const template = Template.fromStack(stack).toJSON();
  //   expect(template).toMatchSnapshot();
  // });
});
