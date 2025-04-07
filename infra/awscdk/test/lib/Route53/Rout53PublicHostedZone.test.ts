// test/route53-public-hosted-zone-stack.test.ts
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Route53PublicHostedZoneStack } from "../../../lib/Route53/Rout53PublicHostedZone";
import { PublicHostedZoneProps } from "aws-cdk-lib/aws-route53";

describe("Route53PublicHostedZoneStack", () => {
  // テスト用の基本Config
  const baseConfig: PublicHostedZoneProps = {
    zoneName: "keiko-diary.com",
    comment: "Public hosted zone for keiko-diary.com",
    caaAmazon: true,
    addTrailingDot: true,
  };

  // 各テストごとに新しい App を生成するための変数
  let app: App;

  beforeEach(() => {
    // 各テスト実行前に新しい App インスタンスを作成
    app = new App();
  });

  it("should synthesize a HostedZone resource with correct properties", () => {
    // App (beforeEach で生成された) を利用してスタックを作成
    const stack = new Route53PublicHostedZoneStack(app, "TestStack", {
      config: baseConfig,
    });
    // 生成された CloudFormation テンプレートを取得
    const template = Template.fromStack(stack);
    // AWS::Route53::HostedZone リソースが 1 つ存在することを検証
    template.resourceCountIs("AWS::Route53::HostedZone", 1);
    // zoneName に addTrailingDot:true のため、Name プロパティは末尾にドットが付き、HostedZoneConfig.Comment も設定される
    template.hasResourceProperties("AWS::Route53::HostedZone", {
      Name: "keiko-diary.com.",
      HostedZoneConfig: {
        Comment: "Public hosted zone for keiko-diary.com",
      },
    });
  });

  it("should generate the correct logical ID from domainName", () => {
    // "keiko-diary.com" から論理IDが "KeikoDiaryCom" に変換されることを期待
    const stack = new Route53PublicHostedZoneStack(app, "TestStackLogicalId", {
      config: baseConfig,
    });
    const expectedLogicalId = "PublicHostedZone-KeikoDiaryCom";
    // stack.node.tryFindChild で生成された論理IDが存在するか検証
    expect(stack.node.tryFindChild(expectedLogicalId)).toBeDefined();
  });

  it("should generate correct logical ID when domainName ends with a non-alphanumeric character", () => {
    // 例: ドメイン名 "test-domain-" の場合、末尾のハイフンは除去され、"TestDomain" になることを期待
    const configWithTrailingSymbol: PublicHostedZoneProps = {
      zoneName: "test-domain-",
      comment: "Public hosted zone for test-domain-",
      caaAmazon: true,
      addTrailingDot: true,
    };
    const stack = new Route53PublicHostedZoneStack(app, "TestStackTrailing", {
      config: configWithTrailingSymbol,
    });
    const expectedLogicalId = "PublicHostedZone-TestDomain";
    expect(stack.node.tryFindChild(expectedLogicalId)).toBeDefined();
  });

  it("should generate correct logical ID when domainName ends with a *", () => {
    // 例: ドメイン名 "test-domain-" の場合、末尾のハイフンは除去され、"TestDomain" になることを期待
    const configWithTrailingSymbol: PublicHostedZoneProps = {
      zoneName: "*.test-domain-",
      comment: "Public hosted zone for test-domain-",
      caaAmazon: true,
      addTrailingDot: true,
    };
    const stack = new Route53PublicHostedZoneStack(
      app,
      "AstrTestStackTrailing",
      {
        config: configWithTrailingSymbol,
      }
    );
    const expectedLogicalId = "PublicHostedZone-AstrTestDomain";
    expect(stack.node.tryFindChild(expectedLogicalId)).toBeDefined();
  });

  it("should match the CloudFormation template snapshot", () => {
    // スナップショットテスト: 生成されたテンプレートが前回のスナップショットと一致するか確認
    const stack = new Route53PublicHostedZoneStack(app, "SnapshotTestStack", {
      config: baseConfig,
    });
    const template = Template.fromStack(stack).toJSON();
    expect(template).toMatchSnapshot();
  });
});
