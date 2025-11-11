# AuctionFlow AWS Deployment Setup

This guide will walk you through deploying the AuctionFlow application to AWS using Amplify and CDK.

## 🚀 Quick Start

### 1. Prerequisites

- **AWS Account** with administrator access
- **AWS CLI** installed and configured
- **Node.js** 18+ installed
- **GitHub repository** with your code

### 2. One-Command Setup

```bash
# 1. Configure AWS CLI (if not done)
aws configure

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.deployment .env.local
# Edit .env.local with your values

# 4. Deploy everything
npm run deploy:full
```

## 📋 Detailed Setup

### Step 1: AWS Configuration

1. **Install AWS CLI** (if not already installed):
   ```bash
   npm install -g aws-cli
   ```

2. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   - Enter your AWS Access Key ID
   - Enter your AWS Secret Access Key
   - Enter default region (recommended: `us-east-1`)
   - Enter default output format (press Enter for default)

3. **Verify AWS Configuration**:
   ```bash
   aws sts get-caller-identity
   ```

### Step 2: Environment Variables

1. **Copy environment template**:
   ```bash
   cp .env.deployment .env.local
   ```

2. **Get your AWS Account ID**:
   ```bash
   aws sts get-caller-identity --query Account --output text
   ```

3. **Edit `.env.local`** and set:
   - `AWS_ACCOUNT_ID`: Your AWS account ID
   - `AWS_REGION`: Your preferred region (default: `us-east-1`)
   - `GITHUB_REPO`: Your GitHub repository URL
   - `GITHUB_TOKEN`: Create a GitHub Personal Access Token

### Step 3: GitHub Personal Access Token

1. **Create GitHub Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token"
   - Give it a name (e.g., "AuctionFlow AWS Deployment")
   - Select scope: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Store the token** in one of two ways:

   **Option A: Environment Variable (simpler for testing)**
   ```bash
   export GITHUB_TOKEN=your_token_here
   ```

   **Option B: AWS Secrets Manager (recommended for production)**
   ```bash
   aws secretsmanager create-secret \
     --name github-token \
     --secret-string "your_token_here" \
     --region us-east-1
   ```

### Step 4: Bootstrap CDK (First Time Only)

```bash
# Get your AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

# Bootstrap CDK
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

### Step 5: Deploy the Application

```bash
# Full deployment (recommended)
npm run deploy:full

# Or step-by-step:
npm run build
npm run cdk:synth
npm run cdk:deploy
```

## 🎯 Post-Deployment Configuration

### 1. Get Your Application URL

After deployment, you'll see outputs like:
```
Outputs:
AmplifyAppId = d3abc123def456
AmplifyDomainUrl = https://main.d3abc123def456.amplifyapp.com
AmplifyDevDomainUrl = https://develop.d3abc123def456.amplifyapp.com
```

### 2. Update Environment Variables

1. **Update `.env.local`**:
   ```bash
   NEXT_PUBLIC_APP_URL=https://main.d3abc123def456.amplifyapp.com
   NEXTAUTH_URL=https://main.d3abc123def456.amplifyapp.com
   ```

2. **Configure in AWS Amplify Console**:
   - Go to AWS Amplify Console
   - Select your `auction-flow` app
   - Navigate to "Environment variables"
   - Add any additional environment variables your app needs

### 3. Set Up Custom Domain (Optional)

1. **In Amplify Console** → "Domain management"
2. **Add custom domain** and configure DNS
3. **Update your environment variables** with the custom domain

## 🛠️ Development Workflow

### Making Changes

1. **Push changes to GitHub**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Amplify will automatically build and deploy** your changes

### Development Branch

Use the `develop` branch for development:
```bash
git checkout -b develop
git push origin develop
```

Your development version will be available at:
`https://develop.d3abc123def456.amplifyapp.com`

## 🔍 Monitoring and Logs

### Build Logs
- AWS Amplify Console → Your App → Build settings → Recent builds

### Application Monitoring
- Enable CloudWatch logs in Amplify Console
- Set up alerts for build failures

### Performance
- Enable Amplify Performance Mode (already configured)
- Monitor with AWS CloudWatch

## 🧹 Cleanup

To destroy all AWS resources:
```bash
npm run destroy
```

**⚠️ Warning**: This will delete your entire application and all data!

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Amplify build logs
   - Verify all dependencies are in package.json
   - Ensure TypeScript compilation succeeds locally

2. **AWS Permissions**:
   - Ensure your IAM user has `AdministratorAccess` or required permissions
   - Verify AWS CLI is configured correctly

3. **GitHub Repository Access**:
   - Ensure repository is public or token has access to private repos
   - Verify GitHub token has correct permissions

4. **Environment Variables**:
   - Check for typos in variable names
   - Ensure sensitive values are properly stored in Secrets Manager

### Useful Commands

```bash
# Check AWS configuration
aws sts get-caller-identity

# List CDK stacks
cdk list

# Preview changes before deployment
cdk diff

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name AuctionFlowStack \
  --query 'Stacks[0].Outputs'
```

## 📊 Cost Optimization

- **Free Tier**: AWS Amplify includes generous free tier benefits
- **Monitoring**: Use AWS Cost Explorer to track costs
- **Cleanup**: Remove unused resources regularly
- **Performance**: Enable auto-scaling for production workloads

## 🔒 Security Considerations

- ✅ HTTPS enabled by default with Amplify
- ✅ Security headers configured in amplify.yml
- ✅ Store secrets in AWS Secrets Manager
- ✅ Regular dependency updates
- ✅ Monitor security vulnerabilities with AWS Inspector

## 📞 Support

If you encounter issues:

1. **Check AWS CloudWatch** for error logs
2. **Review Amplify build logs** for build issues
3. **Verify AWS permissions** and configuration
4. **Check environment variable** settings
5. **Consult AWS documentation** for specific service issues

Happy deploying! 🚀