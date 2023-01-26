#!/usr/bin/env node
import * as dotenv from 'dotenv'
dotenv.config()
import * as cdk from 'aws-cdk-lib'
import 'source-map-support/register'
import { BaseStack } from '../lib/base-stack'
import { BlogStack } from '../lib/blog-stack'

const app = new cdk.App()
const sharedProps: cdk.StackProps = {
  // Set the region/account fields of env to either a concrete
  // value to select the indicated environment (recommended for production stacks)
  env: { account: process.env.CDK_ACCOUNT, region: process.env.CDK_REGION },
}
const baseStack = new BaseStack(app, 'AwsStaticSiteStarterBaseStack', { ...sharedProps })

new BlogStack(app, 'AwsStaticSiteStarterBlogStack', { ...sharedProps, ...baseStack.resources() })
