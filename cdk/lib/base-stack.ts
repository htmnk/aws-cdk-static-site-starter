import type { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as route53 from 'aws-cdk-lib/aws-route53'
import { aws_cloudfront as cf, Duration } from 'aws-cdk-lib'

export interface BaseStackResources {
  bucket: s3.Bucket
  originAccessIdentity: cf.OriginAccessIdentity
  functionAssociations: cf.FunctionAssociation[]
  responseHeadersPolicy: cf.ResponseHeadersPolicy
  zone: route53.IHostedZone
}

export class BaseStack extends cdk.Stack {
  private _bucket: s3.Bucket
  private _originAccessIdentity: cf.OriginAccessIdentity
  private _functionAssociations: cf.FunctionAssociation[]
  private _responseHeadersPolicy: cf.ResponseHeadersPolicy
  private _zone: route53.IHostedZone

  resources(): BaseStackResources {
    return {
      bucket: this._bucket,
      originAccessIdentity: this._originAccessIdentity,
      functionAssociations: this._functionAssociations,
      responseHeadersPolicy: this._responseHeadersPolicy,
      zone: this._zone,
    }
  }

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    this._bucket = new s3.Bucket(this, 'BaseBucket')
    this._originAccessIdentity = new cf.OriginAccessIdentity(this, 'BaseCfOriginAccessIdentity')
    this._bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this._bucket.arnForObjects('*')],
        principals: [
          new iam.CanonicalUserPrincipal(
            this._originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    )
    this._functionAssociations = [
      {
        eventType: cf.FunctionEventType.VIEWER_REQUEST,
        function: new cf.Function(this, 'BaseRequestRewriteFunction', {
          code: cf.FunctionCode.fromFile({ filePath: 'functions/reqRewrite.js' }),
        }),
      },
    ]
    this._responseHeadersPolicy = new cf.ResponseHeadersPolicy(this, 'BaseResponseHeadersPolicy', {
      responseHeadersPolicyName: 'CustomBaseResponseHeadersPolicy',
      securityHeadersBehavior: {
        /**
         * @todo ResponseHeadersPolicy CSP (for you)
         *
         * When using Hugo, implementing a proper Content Security Policy (CSP) can be
         * challenging when there is limited control over the scripts included on the site.
         */
        // contentSecurityPolicy: { contentSecurityPolicy: 'default-src https:;', override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cf.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cf.HeadersReferrerPolicy.NO_REFERRER,
          override: true,
        },
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: Duration.days(365 * 2),
          includeSubdomains: true,
          preload: true,
        },
        xssProtection: { override: true, protection: true, modeBlock: true },
      },
    })
    this._zone = route53.HostedZone.fromLookup(this, 'BaseHostedZone', {
      domainName: process.env.DOMAIN_NAME ?? '',
    })
  }
}
