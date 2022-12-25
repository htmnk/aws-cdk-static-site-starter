#!/usr/bin/env node
import * as dotenv from 'dotenv'
dotenv.config()
import * as cdk from 'aws-cdk-lib'
import 'source-map-support/register'
import { BaseStack } from '../lib/base-stack'
import { BlogStack } from '../lib/blog-stack'

const app = new cdk.App()
const baseStack = new BaseStack(app, 'AwsStaticSiteStarterBaseStack')

new BlogStack(app, 'AwsStaticSiteStarterBlogStack', { ...baseStack.resources() })
