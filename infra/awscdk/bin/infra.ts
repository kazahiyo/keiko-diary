#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { domainRecourceConfig } from "../configs/infra.config";
import { Route53PublicHostedZoneStack } from "../lib/Route53/Rout53PublicHostedZone";
import { AcmCertificateStack } from "../lib/ACM/AcmCertificate";
import { DomainRecourceConfig } from "../configs/model";
import { BucketDistributionStack } from "../lib/S3CloudFront/BucketDistribution";
import { PublicHostedZoneAttributes } from "aws-cdk-lib/aws-route53";
import { S3BucketStack } from "../lib/S3/S3Bucket";
import { CloudFrontDistribution } from "../lib/CloudFront/CloudFrontDistribution";
import { Route53ARecordStack } from "../lib/Route53/Rout53ARecord";

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
  let publicHostedZoneAttributes: PublicHostedZoneAttributes | undefined =
    undefined;
  let certificateArn: string | undefined = undefined;

  if (
    config.route53?.publicHostedZone?.createReource ||
    config.acm.certificate.createReource ||
    config.hostConfig.some((hostConfig) => hostConfig.createReource)
  ) {
    const route53PublicHostedZoneStack = new Route53PublicHostedZoneStack(
      app,
      `Route53PublicHostedZone-${createValidStackName(config.domainName)}`,
      {
        config: config.route53.publicHostedZone.publicHostedZoneProps,
        env: { region: "us-east-1" },
        crossRegionReferences: true,
      } // スタックのプロパティを設定
    );

    publicHostedZoneAttributes = {
      hostedZoneId: route53PublicHostedZoneStack.publicHostedZone.hostedZoneId,
      zoneName: route53PublicHostedZoneStack.publicHostedZone.zoneName,
    };

    if (
      config.acm.certificate.createReource ||
      config.hostConfig.some((hostConfig) => hostConfig.createReource)
    ) {
      const acmCertificateStack = new AcmCertificateStack(
        app,
        `AcmCertificate-${createValidStackName(config.domainName)}`, // スタックのIDを設定
        {
          config: config.acm.certificate.certificateProps,
          publicHostedZoneAttributes,
          env: { region: "us-east-1" },
          crossRegionReferences: true,
        } // スタックのプロパティを設定
      );
      certificateArn = acmCertificateStack.certificate.certificateArn;
    }
  }

  for (const hostConfig of config.hostConfig) {
    if (
      hostConfig.createReource &&
      publicHostedZoneAttributes &&
      certificateArn
    ) {
      const S3CloudFrontStack = new BucketDistributionStack(
        app,
        `S3CloudFront-${createValidStackName(hostConfig.fqdn)}`, // スタックのIDを設定
        {
          config: hostConfig,
          certificateArn,
          crossRegionReferences: true,
          env: { region: "ap-northeast-1" },
        }
      );

      const recordNames: string[] = [
        hostConfig.fqdn,
        ...(hostConfig.altDomainNames || []),
      ];

      recordNames.forEach((recordName) => {
        const aRecord = new Route53ARecordStack(
          app,
          `Route53ARecord-${createValidStackName(recordName)}`, // スタックのIDを設定
          {
            recordName,
            env: { region: "us-east-1" },
            publicHostedZoneAttributes,
            crossRegionReferences: true,
            distributionAttribute: {
              distributionId: S3CloudFrontStack.distribution.distributionId,
              domainName: S3CloudFrontStack.distribution.domainName,
            },
          } // スタックのプロパティを設定
        );
      });
    }
  }
}
