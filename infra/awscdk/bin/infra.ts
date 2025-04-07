#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { domainRecourceConfig } from "../configs/infra.config";
import { Route53PublicHostedZoneStack } from "../lib/Route53/Rout53PublicHostedZone";
import { AcmCertificateStack } from "../lib/ACM/AcmCertificate";
import { DomainRecourceConfig } from "../configs/model";
import { BucketDistributionARecordStack } from "../lib/S3CloudFrontRoute53/BucketDistributionARecord";

const checkConfig = (domainRecourceConfig: DomainRecourceConfig[]) => {
  for (const config of domainRecourceConfig) {
    if (config.domainName === "") throw new Error("domainName is required");

    if (
      config.domainName !==
      config.route53?.publicHostedZone?.publicHostedZoneProps?.zoneName
    )
      throw new Error(`domainName and zoneName must be same
        domainName: ${config.domainName}
        zoneName: ${config.route53.publicHostedZone.publicHostedZoneProps.zoneName}
      `);

    if (
      !config.acm.certificate.certificateProps.domainName.endsWith(
        config.domainName
      )
    ) {
      throw new Error(`sub domainName must belong to domainName
        domainName: ${config.domainName}
        sub domainName: ${config.acm.certificate.certificateProps.domainName}
      `);
    }
    if (
      config.acm.certificate.certificateProps.subjectAlternativeNames &&
      config.acm.certificate.certificateProps.subjectAlternativeNames.length > 0
    ) {
      if (
        config.acm.certificate.certificateProps.subjectAlternativeNames.some(
          (subjectAlternativeName) =>
            !subjectAlternativeName.endsWith(config.domainName)
        )
      ) {
        throw new Error(`Alt sub domainName must belong to domainName
          domainName: ${config.domainName}
          sub domainName: ${config.acm.certificate.certificateProps.domainName}`);
      }
    }

    if (
      config.hostConfig.some(
        (hostConfig) => !hostConfig.fqdn.endsWith(config.domainName)
      )
    )
      throw new Error("fqdn must belong to domainName");

    for (const hostConfig of config.hostConfig) {
      if (!hostConfig.s3.bucket.bucketProps.bucketName)
        throw new Error("bucketName is required");
      if (hostConfig.s3.bucket.bucketProps.bucketName !== hostConfig.fqdn)
        throw new Error(`
          bucketName must be same as fqdn
          bucketName: ${hostConfig.s3.bucket.bucketProps.bucketName}
          fqdn: ${hostConfig.fqdn}
        `);
    }
  }
};

const createValidStackName = (name: string) =>
  // アスタリスク(*)を "Astr" に置換
  // 非英数字部分を削除し、直後の文字を大文字に
  // 先頭文字を大文字化
  name
    .replace(/\*/g, "Astr")
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (m) => m.toUpperCase());

// 設定ファイルの検証
checkConfig(domainRecourceConfig);

const app = new cdk.App();

for (const config of domainRecourceConfig) {
  // route53PublicHostedZoneStackを作成
  let route53PublicHostedZoneStack: Route53PublicHostedZoneStack | undefined =
    undefined;

  let acmCertificateStack: AcmCertificateStack | undefined = undefined;

  if (
    config.route53?.publicHostedZone?.createReource ||
    config.acm.certificate.createReource ||
    config.hostConfig.some((hostConfig) => hostConfig.createReource)
  ) {
    route53PublicHostedZoneStack = new Route53PublicHostedZoneStack(
      app,
      `Route53PublicHostedZone-${createValidStackName(config.domainName)}`,
      {
        config: config.route53.publicHostedZone.publicHostedZoneProps,
        env: { region: "us-east-1" },
        crossRegionReferences: true,
      } // スタックのプロパティを設定
    );

    if (
      config.acm.certificate.createReource ||
      config.hostConfig.some((hostConfig) => hostConfig.createReource)
    ) {
      acmCertificateStack = new AcmCertificateStack(
        app,
        `AcmCertificate-${createValidStackName(config.domainName)}`, // スタックのIDを設定
        {
          config: config.acm.certificate.certificateProps,
          publicHostedZone: route53PublicHostedZoneStack.publicHostedZone,
          env: { region: "us-east-1" },
          crossRegionReferences: true,
        } // スタックのプロパティを設定
      );
    }
  }

  for (const hostConfig of config.hostConfig) {
    if (
      hostConfig.createReource &&
      acmCertificateStack &&
      route53PublicHostedZoneStack
    ) {
      const bucketDistributionStack = new BucketDistributionARecordStack(
        app,
        `S3CloudFrontRoute53-${createValidStackName(hostConfig.fqdn)}`, // スタックのIDを設定
        {
          config: hostConfig,
          certificate: acmCertificateStack.certificate,
          publicHostedZone: route53PublicHostedZoneStack.publicHostedZone,
          env: { region: "ap-northeast-1" },
          crossRegionReferences: true,
        } // スタックのプロパティを設定
      );
    }
  }
}
