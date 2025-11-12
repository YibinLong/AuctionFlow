#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SimpleAuctionFlowStack } from '../lib/simple-stack';

const app = new cdk.App();
new SimpleAuctionFlowStack(app, 'SimpleAuctionFlowStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});