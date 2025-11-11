#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuctionFlowStack } from '../lib/auction-flow-stack';

const app = new cdk.App();
new AuctionFlowStack(app, 'AuctionFlowStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});