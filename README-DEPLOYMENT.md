# AuctionFlow AWS Deployment Guide

This guide will help you deploy the AuctionFlow application to AWS using Amplify and CDK.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS CLI**: Install and configure AWS CLI
   ```bash
   npm install -g aws-cli
   aws configure
   ```
3. **Node.js**: Version 18 or higher
4. **GitHub Repository**: Your code should be pushed to GitHub

## Environment Variables Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your values:
   - `AWS_ACCOUNT_ID`: Your AWS account ID (get from AWS console)
   - `AWS_REGION`: Your preferred AWS region (default: us-east-1)
   - `GITHUB_REPO`: Your GitHub repository URL

3. Create a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create a token with `repo` scope
   - Store this token in AWS Secrets Manager as `github-token`

## Deployment Steps

### Option 1: Quick Deployment
```bash
npm run deploy:full
```

### Option 2: Step-by-Step Deployment

1. **Bootstrap CDK** (first time only):
   ```bash
   npm run cdk:bootstrap
   ```

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Deploy infrastructure**:
   ```bash
   npm run cdk:deploy
   ```

## Post-Deployment Configuration

1. **Update Application URL**:
   - Get the Amplify URL from the deployment output
   - Update `NEXT_PUBLIC_APP_URL` in your .env file
   - Update `NEXTAUTH_URL` if using authentication

2. **Configure Environment Variables in Amplify Console**:
   - Go to AWS Amplify Console
   - Select your app
   - Navigate to "Environment variables"
   - Add any additional environment variables your app needs

3. **Set up Custom Domain** (optional):
   - In Amplify Console, go to "Domain management"
   - Add your custom domain and configure DNS

## Monitoring and Logs

- **Build Logs**: Check AWS Amplify Console for build logs
- **Application Logs**: Use Amazon CloudWatch for application monitoring
- **Performance**: Enable AWS Amplify Performance Mode for better performance

## Cleanup

To destroy all AWS resources:
```bash
npm run destroy
```

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**:
   ```bash
   npm run cdk:bootstrap
   ```

2. **AWS Permissions**:
   - Ensure your IAM user has `AdministratorAccess` or required permissions

3. **Build Failures**:
   - Check build logs in Amplify Console
   - Ensure all dependencies are installed correctly

4. **Environment Variables**:
   - Verify all required environment variables are set
   - Check for typos in variable names

### Useful Commands

```bash
# Synthesize CloudFormation template
npm run cdk:synth

# Check CDK diff before deployment
cdk diff

# List all deployed stacks
cdk list

# Get specific stack outputs
cdk describe-stacks --stack-name AuctionFlowStack
```

## Cost Optimization

- Enable auto-scaling for production workloads
- Use AWS Cost Explorer to monitor costs
- Consider using AWS Free Tier benefits
- Clean up unused resources regularly

## Security Considerations

- Use HTTPS for all traffic (Amplify provides this by default)
- Store sensitive data in AWS Secrets Manager
- Enable security headers (configured in amplify.yml)
- Regularly update dependencies
- Monitor for security vulnerabilities with AWS Inspector

## Support

If you encounter issues during deployment:

1. Check AWS CloudWatch for error logs
2. Review Amplify build logs
3. Verify AWS permissions
4. Check environment variable configuration
5. Consult AWS documentation for specific service issues