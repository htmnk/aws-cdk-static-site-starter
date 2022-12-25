import type { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import { aws_cloudfront as cf } from 'aws-cdk-lib'

export interface BaseStackResources {
  bucket: s3.Bucket
  originAccessIdentity: cf.OriginAccessIdentity
  functionAssociations: cf.FunctionAssociation[]
}

export class BaseStack extends cdk.Stack {
  private _bucket: s3.Bucket
  private _originAccessIdentity: cf.OriginAccessIdentity
  private _functionAssociations: cf.FunctionAssociation[]

  resources(): BaseStackResources {
    return {
      bucket: this._bucket,
      originAccessIdentity: this._originAccessIdentity,
      functionAssociations: this._functionAssociations,
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
  }
}
