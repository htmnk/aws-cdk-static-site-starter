import { join } from 'path'
import type { Construct } from 'constructs'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'

type CacheControlMaxAge = '0' | '31536000'
type SiteBucketDeploymentProps = Omit<s3deploy.BucketDeploymentProps, 'sources'> & {
  sitePaths: string[]
  longCacheFileExtensions: string[]
}
type CachedBucketDeploymentProps = SiteBucketDeploymentProps & { maxAge: CacheControlMaxAge }
class CachedBucketDeployment extends s3deploy.BucketDeployment {
  constructor(scope: Construct, id: string, props: CachedBucketDeploymentProps) {
    const { sitePaths, longCacheFileExtensions, maxAge } = props
    const longCacheFiles = `.{${longCacheFileExtensions.join(',')}}`
    const assetOptions = {
      exclude: [
        ...(maxAge === '31536000'
          ? ['**/*.*', '!**/*' + longCacheFiles]
          : ['**/*' + longCacheFiles]),
      ],
    }
    const cacheControl = `max-age=${maxAge},public,${
      maxAge === '31536000' ? 'immutable' : 'must-revalidate'
    }`

    super(scope, id, {
      ...props,
      sources: [s3deploy.Source.asset(join(__dirname, ...sitePaths), assetOptions)],
      cacheControl: [s3deploy.CacheControl.fromString(cacheControl)],
      prune: false,
    })
  }
}
/**
 * Creates multiple bucket deployments for the same destination bucket
 * in order to set different Cache-Control headers (rule of thumb:
 * either a very long `maxAge` or `maxAge: 0`) for different types of files.
 *
 * `.css`, `.js` files are usually distributed with a hash such as `[name].[contenthash].js`
 * so a `max-age=31536000,public,immutable` Cache-Control header will be set.
 *
 * `.html` files are usually expected to be invalidated every time since their URLs
 * cannot be versioned and their content must be able to change so a
 * `public,max-age=0,must-revalidate` header will be set for all the file extensions
 * that are not found inside `longCacheFileExtensions`.
 *
 * @example
 * new SiteBucketDeployment(this, 'SiteDeployment', {
 *   longCacheFileExtensions: ['js', 'css'],
 *   sitePaths: ['..', '..', 'dist'],
 * })
 *
 */
export default class SiteBucketDeployment {
  private readonly _maxAgePatterns: CacheControlMaxAge[] = ['0', '31536000']
  private readonly _constructIdSuffix: Record<CacheControlMaxAge, string> = {
    '0': 'NoCache',
    '31536000': 'LongCache',
  }

  private _createCachedBucketDeployment(
    scope: Construct,
    id: string,
    props: CachedBucketDeploymentProps,
    cleanupDeployment: s3deploy.BucketDeployment
  ) {
    new CachedBucketDeployment(scope, id + this._constructIdSuffix[props.maxAge], {
      ...props,
      maxAge: props.maxAge,
    }).node.addDependency(cleanupDeployment)
  }

  constructor(scope: Construct, id: string, props: SiteBucketDeploymentProps) {
    /**
     * Initial deployment for cleaning up the content from previous deploys.
     * Since `prune: false` is used for the actual deployments, in some cases the
     * unnecessary files (i.e some frameworks generate different static/<hash> directories
     * on every new build, etc.) won't be deleted otherwise.
     *
     * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment-readme.html#prune
     */
    const cleanupDeployment = new s3deploy.BucketDeployment(scope, id + 'Cleanup', {
      ...props,
      sources: [s3deploy.Source.asset(join(__dirname, ...props.sitePaths))],
      prune: true,
    })

    this._maxAgePatterns.forEach((maxAge) => {
      this._createCachedBucketDeployment(scope, id, { ...props, maxAge }, cleanupDeployment)
    })
  }
}
