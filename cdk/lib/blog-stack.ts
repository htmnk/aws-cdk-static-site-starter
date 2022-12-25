import type { Construct } from 'constructs'
import type { BaseStackResources } from './base-stack'
import * as cdk from 'aws-cdk-lib'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import { aws_cloudfront as cf } from 'aws-cdk-lib'
import SiteBucketDeployment from './SiteBucketDeployment'

export class BlogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & BaseStackResources) {
    super(scope, id, props)
    const { bucket, originAccessIdentity, functionAssociations } = props

    const cfDistribution = new cf.Distribution(this, 'BlogCfDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        functionAssociations: [...functionAssociations],
        origin: new origins.S3Origin(bucket, {
          originAccessIdentity,
          originPath: '/blog',
        }),
      },
    })

    new SiteBucketDeployment(this, 'BlogBucketDeployment', {
      longCacheFileExtensions: ['js', 'css'],
      sitePaths: ['..', '..', 'public'],
      destinationBucket: bucket,
      distributionPaths: ['/*'],
      distribution: cfDistribution,
      destinationKeyPrefix: 'blog',
    })
  }
}
