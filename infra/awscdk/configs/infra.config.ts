import { RemovalPolicy } from "aws-cdk-lib";
import { DomainRecourceConfig } from "./model";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";

export const domainRecourceConfig: DomainRecourceConfig[] = [
  {
    domainName: "keiko-diary.com",
    route53: {
      publicHostedZone: {
        createReource: true,
        publicHostedZoneProps: {
          zoneName: "keiko-diary.com",
          comment: "Public hosted zone for keiko-diary.com.",
          caaAmazon: true,
          addTrailingDot: true,
        },
      },
    },
    acm: {
      certificate: {
        certificateProps: {
          domainName: "keiko-diary.com",
          subjectAlternativeNames: ["*.keiko-diary.com"],
        },
        createReource: true,
      },
    },
    hostConfig: [
      {
        fqdn: "www.keiko-diary.com",
        altDomainNames: ["keiko-diary.com"],
        createReource: true,
        s3: {
          bucket: {
            bucketProps: {
              bucketName: "www.keiko-diary.com",
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
      },
    ],
  },
];
