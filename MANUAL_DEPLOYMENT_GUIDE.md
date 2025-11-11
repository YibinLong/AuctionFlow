# Manual Amplify Deployment Guide

Since your AWS credentials in .env are invalid, here's a simple manual setup to get your deployment working:

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "AuctionFlow Amplify"
4. Set the following scopes:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (Full control of repository hooks)
5. Click "Generate token"
6. **Copy this token** - you won't be able to see it again

## Step 2: Create AWS Secrets Manager Secret

1. Go to AWS Secrets Manager console
2. Click "Store a new secret"
3. Select "Other type of secret"
4. In the "Key/value pairs" section:
   - Key: `GITHUB_TOKEN`
   - Value: [paste your GitHub token here]
5. Click "Next"
6. Secret name: `github-token`
7. Click "Next" twice, then "Store"

## Step 3: Deploy CDK Stack

1. **Fix your AWS credentials** in `.env` file or configure AWS CLI properly:
   ```bash
   aws configure
   ```
   Enter your valid AWS Access Key ID, Secret Access Key, region (us-west-2), and output format (json).

2. Bootstrap CDK (only need to do this once):
   ```bash
   cdk bootstrap
   ```

3. Deploy the stack:
   ```bash
   cdk deploy
   ```

## Step 4: Alternative - Direct Amplify Console Setup

If CDK doesn't work, you can set up directly in Amplify Console:

1. Go to AWS Amplify console
2. Click "Create new app" > "Host web app"
3. Connect GitHub account
4. Select your `YibinLong/AuctionFlow` repository
5. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: out
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
6. In advanced settings:
   - Branch name: `main`
   - Enable auto-build: ✅
   - Add environment variable: `NODE_ENV=production`

## After Deployment

Once deployed, your app will be available at:
- **Main branch**: `https://main.d9i1hvy2mt5lg.amplifyapp.com/`
- **Admin route**: `https://main.d9i1hvy2mt5lg.amplifyapp.com/admin/`

Every push to the `main` branch will automatically trigger a new deployment.

## Troubleshooting

If deployment fails:
1. Check the build logs in Amplify console
2. Ensure your Next.js app builds locally with `npm run build`
3. Verify the `out` directory is created after build
4. Make sure all environment variables are properly set

## Current Configuration

Your current CDK stack is configured to:
- ✅ Use GitHub repository: `https://github.com/YibinLong/AuctionFlow`
- ✅ Auto-build on main branch pushes
- ✅ Deploy from `out` directory (Next.js static export)
- ✅ Handle SPA routing with 404-200 redirects
- ✅ Use production environment variables