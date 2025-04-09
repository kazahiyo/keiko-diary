import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AcmCertificateStack, AcmCertificateProps } from "../../../lib/ACM/AcmCertificate";

describe("AcmCertificateStack", () => {
  // テスト用の PublicHostedZoneAttributes を定義
  const hostedZoneAttributes = {
    hostedZoneId: "Z11111111111111",
    zoneName: "example.com",
  };

  test("デフォルトの証明書プロパティが正しく適用される", () => {
    const domainName = "api.example.com-";

    const app = new App();
    const stack = new AcmCertificateStack(app, "TestStackDefault", {
      config: { domainName },
      publicHostedZoneAttributes: hostedZoneAttributes,
    } as AcmCertificateProps);

    const template = Template.fromStack(stack);

    // 証明書リソースが 1 件生成されること
    template.resourceCountIs("AWS::CertificateManager::Certificate", 1);

    // DomainName と DomainValidationOptions の HostedZoneId が正しく設定されているか確認
    template.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: domainName,
      DomainValidationOptions: [
        {
          DomainName: domainName,
          HostedZoneId: hostedZoneAttributes.hostedZoneId,
        },
      ],
    });
  });

  // test("独自の証明書プロパティ（certificateName）がオーバーライドされる", () => {
  //   const domainName = "api.example.com-";
  //   const customCertificateName = "CustomCertificateName";

  //   const app = new App();
  //   const stack = new AcmCertificateStack(app, "TestStackOverride", {
  //     config: {
  //       domainName,
  //       certificateName: customCertificateName, // デフォルトを上書き
  //     },
  //     publicHostedZoneAttributes: hostedZoneAttributes,
  //   } as AcmCertificateProps);

  //   const template = Template.fromStack(stack);

  //   // 証明書リソースが上書きされた certificateName を持つことを確認
  //   template.hasResourceProperties("AWS::CertificateManager::Certificate", {
  //     DomainName: domainName,
  //     CertificateName: customCertificateName,
  //     DomainValidationOptions: [
  //       {
  //         DomainName: domainName,
  //         HostedZoneId: hostedZoneAttributes.hostedZoneId,
  //       },
  //     ],
  //   });
  // });

  test("Synth 結果のテンプレートがスナップショットと一致する", () => {
    const domainName = "api.example.com";

    const app = new App();
    const stack = new AcmCertificateStack(app, "TestStackSnapshot", {
      config: { domainName },
      publicHostedZoneAttributes: hostedZoneAttributes,
    } as AcmCertificateProps);

    const template = Template.fromStack(stack).toJSON();

    expect(template).toMatchSnapshot();
  });
});
