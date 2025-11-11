#!/bin/bash

# =============================================================================
# AuctionFlow AWS Deployment Script
# =============================================================================

set -e

echo "🚀 Starting AuctionFlow AWS deployment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity --query Account --output text > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account: $AWS_ACCOUNT_ID"

# Check if CDK is bootstrapped
echo "🔧 Checking CDK bootstrap..."
if ! cdk bootstrap aws://$AWS_ACCOUNT_ID/$(aws configure get region) 2>/dev/null; then
    echo "🔧 Bootstrapping CDK..."
    cdk bootstrap aws://$AWS_ACCOUNT_ID/$(aws configure get region)
fi

# Build the Next.js application
echo "🏗️  Building Next.js application..."
npm run build

# Synthesize CDK template
echo "📋 Synthesizing CDK template..."
npm run cdk:synth

# Deploy CDK stack
echo "🚀 Deploying AWS infrastructure..."
npm run cdk:deploy

echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with the actual Amplify URL from the deployment output"
echo "2. Configure any additional environment variables in the AWS Amplify console"
echo "3. Set up any required secrets in AWS Secrets Manager (e.g., github-token)"
echo "4. Test your deployed application at the provided Amplify URL"