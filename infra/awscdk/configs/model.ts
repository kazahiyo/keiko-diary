import { CertificateProps } from "aws-cdk-lib/aws-certificatemanager";
import { DistributionProps } from "aws-cdk-lib/aws-cloudfront";
import { S3OriginProps } from "aws-cdk-lib/aws-cloudfront-origins";
import { PublicHostedZoneProps } from "aws-cdk-lib/aws-route53";
import { BucketProps } from "aws-cdk-lib/aws-s3";

export interface DomainRecourceConfig {
  domainName: string;
  route53: {
    publicHostedZone: {
      createReource: boolean;
      publicHostedZoneProps: PublicHostedZoneProps;
    };
  };
  acm: {
    certificate: {
      certificateProps: CertificateProps;
      createReource: boolean;
    };
  };

  hostConfig: HostConfig[];
}

export interface HostConfig {
  fqdn: string;
  altDomainNames?: string[];
  createReource: boolean;
  s3: {
    bucket: {
      bucketProps: BucketProps;
    };
  };
  cloudFront: {
    distribution?: {
      createReource: boolean;
    };
  };
  route53: {
    aRecord?: {
      createReource: boolean;
    };
  };
}
