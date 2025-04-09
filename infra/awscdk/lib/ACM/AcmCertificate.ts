import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IPublicHostedZone, PublicHostedZone, PublicHostedZoneAttributes } from "aws-cdk-lib/aws-route53";
import {
  Certificate,
  CertificateProps,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

// サブドメイン証明書用スタックのプロパティインターフェース
export interface AcmCertificateProps extends StackProps {
  readonly config: CertificateProps;
  readonly publicHostedZoneAttributes: PublicHostedZoneAttributes;
}

// 証明書作成のためのデフォルトプロパティを生成するヘルパー関数
const getAcmCertificateProps = (
  config: CertificateProps, // AcmCertificateConfig には subDomainName が定義されている前提
  iPublicHostedZone: IPublicHostedZone
): CertificateProps => ({
  domainName: config.domainName, // サブドメイン名を証明書対象とする
  certificateName: config.domainName, // 証明書の名前もサブドメイン名にする（必要に応じて変更）
  validation: CertificateValidation.fromDns(iPublicHostedZone), // DNS検証を使用
});

// サブドメイン用の証明書を作成するスタック
export class AcmCertificateStack extends Stack {
  certificate: Certificate; // 作成した証明書リソースを保持するプロパティ

  constructor(scope: Construct, id: string, props: AcmCertificateProps) {
    super(scope, id, props);

    // 論理IDを、subDomainName から生成（例："api.keiko-diary.com" → "ApiKeikoDiaryCom"）
    const logicalId = props.config.domainName
      .replace(/\*/g, "Astr") // アスタリスク(*)を "Astr" に置換
      .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")) // 非英数字部分を削除し、直後の文字を大文字に
      .replace(/^./, (m) => m.toUpperCase()); // 先頭文字を大文字化

    const iPublicHostedZone = PublicHostedZone.fromHostedZoneAttributes(
      this,
      `PublicHostedZone-${logicalId}`,
      props.publicHostedZoneAttributes
    );

    // デフォルトの証明書プロパティを生成
    const defaultCertificateProps = getAcmCertificateProps(
      props.config,
      iPublicHostedZone
    );

    // デフォルトのプロパティと、config内で追加・上書き指定されたプロパティをマージする
    const certificateProps = {
      ...defaultCertificateProps, // 生成されたデフォルト設定
      ...props.config, // 設定ファイルで上書き・追加された設定
    };

    // 証明書リソースを作成
    this.certificate = new Certificate(
      this,
      `Certificate-${logicalId}`,
      certificateProps
    );
  }
}
