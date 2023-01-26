import type { Construct } from 'constructs'
import type { BaseStackResources } from './base-stack'
import * as cdk from 'aws-cdk-lib'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import { aws_cloudfront as cf, aws_route53_patterns } from 'aws-cdk-lib'
import { join } from 'path'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as route53targets from 'aws-cdk-lib/aws-route53-targets'

export class BlogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & BaseStackResources) {
    super(scope, id, props)
    const { env, bucket, originAccessIdentity, functionAssociations, zone, responseHeadersPolicy } =
      props
    const domainName = process.env.DOMAIN_NAME ?? ''
    const cfDistribution = new cf.Distribution(this, 'BlogCfDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        functionAssociations: [...functionAssociations],
        origin: new origins.S3Origin(bucket, {
          originAccessIdentity,
          originPath: '/blog',
        }),
        responseHeadersPolicy,
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      priceClass: cf.PriceClass.PRICE_CLASS_ALL,
      domainNames: [domainName],
      certificate: new acm.DnsValidatedCertificate(this, 'BlogCertificate', {
        domainName,
        subjectAlternativeNames: ['www.' + domainName],
        hostedZone: zone,
        region: env?.region,
      }),
      errorResponses: [{ httpStatus: 403, responseHttpStatus: 404, responsePagePath: '/404.html' }],
    })

    new s3deploy.BucketDeployment(this, 'BlogBucketDeployment', {
      destinationBucket: bucket,
      distribution: cfDistribution,
      distributionPaths: ['/*'],
      destinationKeyPrefix: 'blog',
      sources: [s3deploy.Source.asset(join(__dirname, '..', '..', 'public'))],
    })

    new route53.ARecord(this, 'BlogAliasRecord', {
      zone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(cfDistribution)),
    })

    new aws_route53_patterns.HttpsRedirect(this, 'BlogWwwToNonWww', {
      zone,
      recordNames: ['www.' + domainName],
      targetDomain: domainName,
    })
  }
}
