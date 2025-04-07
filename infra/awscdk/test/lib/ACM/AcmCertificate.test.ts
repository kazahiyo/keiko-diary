// test/AcmCertificateStack.test.ts
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
  AcmCertificateStack,
  AcmCertificateProps,
} from "../../../lib/ACM/AcmCertificate";
import { PublicHostedZone } from "aws-cdk-lib/aws-route53";
import { CertificateProps } from "aws-cdk-lib/aws-certificatemanager";

describe("AcmCertificateStack", () => {
  let app: App;
  let hostedZoneStack: Stack;
  let hostedZone: PublicHostedZone;

  // 基本の ACM 証明書設定（certificateProps 未指定）
  const baseConfig: CertificateProps = {
    domainName: "api.keiko-diary.com",
    // certificateProps はオプションなので未指定
  };

  beforeEach(() => {
    // 各テストごとに新しい App と HostedZone を作成
    app = new App();
    hostedZoneStack = new Stack(app, "HostedZoneStack");
    hostedZone = new PublicHostedZone(hostedZoneStack, "TestHostedZone", {
      zoneName: "keiko-diary.com", // zoneName は末尾のドットなしで設定
    });
  });

  it("creates a Certificate resource with default properties", () => {
    // AcmCertificateStack を作成（baseConfig でデフォルト設定が利用される）
    const stack = new AcmCertificateStack(app, "TestAcmCertificateStack", {
      config: baseConfig,
      publicHostedZone: hostedZone,
    } as AcmCertificateProps);

    // CloudFormation テンプレートを取得
    const template = Template.fromStack(stack);
    // Certificate リソース（L1 リソース AWS::CertificateManager::Certificate）が 1 つ生成されることを検証
    template.resourceCountIs("AWS::CertificateManager::Certificate", 1);
    // Certificate の DomainName が "api.keiko-diary.com" に設定されていることを検証
    template.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: "api.keiko-diary.com",
    });
  });

  it("merges additional certificateProps from config", () => {
    // 追加の certificateProps を指定した場合の動作確認
    // ※CertificateProps では domainName は必須なので、customProps にも追加する
    const customProps = {
      domainName: "api.keiko-diary.com", // 既定の値と同じ
      subjectAlternativeNames: ["www.api.keiko-diary.com"],
      certificateName: "custom-certificate", // L2 のプロパティとしては設定されるが CloudFormation には出力されない
    };
    const baseConfig: CertificateProps = {
      domainName: "api.keiko-diary.com",
      // certificateProps はオプションなので未指定
    };
    const configWithCustomProps: CertificateProps = {
      ...baseConfig,
      ...customProps,
    };
    const stack = new AcmCertificateStack(app, "TestCustomPropsStack", {
      config: configWithCustomProps,
      publicHostedZone: hostedZone,
    } as AcmCertificateProps);

    const template = Template.fromStack(stack);
    // CloudFormation テンプレートでは、CertificateName はサポートされていないため、以下は SubjectAlternativeNames のみを検証
    template.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: "api.keiko-diary.com",
      SubjectAlternativeNames: ["www.api.keiko-diary.com"],
    });
  });

  it("should generate correct logical ID when domainName ends with a non-alphanumeric character", () => {
    // 例: ドメイン名 "test-domain-" の場合、末尾のハイフンは除去され、"TestDomain" になることを期待
    const configWithTrailingSymbol: CertificateProps = {
      domainName: "test-domain-",
    };
    const stack = new AcmCertificateStack(app, "TestStackTrailing", {
      config: configWithTrailingSymbol,
      publicHostedZone: hostedZone,
    });
    const expectedLogicalId = "Certificate-TestDomain";
    expect(stack.node.tryFindChild(expectedLogicalId)).toBeDefined();
  });

  it("generates the correct logical ID from subDomainName", () => {
    // "api.keiko-diary.com" から論理IDを生成すると "Certificate-ApiKeikoDiaryCom" となるはず
    const stack = new AcmCertificateStack(app, "TestLogicalIdStack", {
      config: baseConfig,
      publicHostedZone: hostedZone,
    } as AcmCertificateProps);
    const expectedLogicalId = "Certificate-ApiKeikoDiaryCom";
    // stack.node.tryFindChild により生成された論理IDが存在するか確認
    expect(stack.node.tryFindChild(expectedLogicalId)).toBeDefined();
  });

  it("generates the correct logical ID from subDomainName with *", () => {
    // 例: ドメイン名 "*.test-domain-" の場合、"AstrTestDomain" になることを期待
    const configWithTrailingSymbol: CertificateProps = {
      domainName: "*.test-domain-",
    };
    const stack = new AcmCertificateStack(app, "AstrTestLogicalIdStack", {
      config: configWithTrailingSymbol,
      publicHostedZone: hostedZone,
    } as AcmCertificateProps);
    const expectedLogicalId = "Certificate-AstrTestDomain";
    // stack.node.tryFindChild により生成された論理IDが存在するか確認
    expect(stack.node.tryFindChild(expectedLogicalId)).toBeDefined();
  });

  it("matches the CloudFormation template snapshot", () => {
    // スナップショットテスト: 生成された CloudFormation テンプレートが基準スナップショットと一致するか確認
    const stack = new AcmCertificateStack(app, "SnapshotStack", {
      config: baseConfig,
      publicHostedZone: hostedZone,
    } as AcmCertificateProps);
    const template = Template.fromStack(stack).toJSON();
    expect(template).toMatchSnapshot();
  });
});
