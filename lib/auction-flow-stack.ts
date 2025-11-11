import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AuctionFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create GitHub token secret (you need to create this manually in AWS Secrets Manager)
    // Go to AWS Secrets Manager > Create secret > Other type of secret
    // Secret key: GITHUB_TOKEN, Secret value: your_github_token
    // Secret name: github-token
    const githubTokenSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubTokenSecret', 'github-token');

    // Create Amplify app
    const amplifyApp = new amplify.CfnApp(this, 'AuctionFlowApp', {
      name: 'auction-flow',
      description: 'AuctionFlow - Modern Auction Checkout System v2',
      platform: 'WEB',
      repository: process.env.GITHUB_REPO || 'https://github.com/YibinLong/AuctionFlow',
      buildSpec: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - rm -rf node_modules package-lock.json
        - npm ci --legacy-peer-deps
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: out
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*`,
      // For static-exported Next.js sites, use empty customRules
      // This lets Amplify serve static files directly and handle trailing slashes properly
      customRules: [],
      environmentVariables: [
        {
          name: 'NODE_ENV',
          value: 'production',
        },
      ],
      oauthToken: githubTokenSecret.secretValue.unsafeUnwrap(),
      tags: [
        {
          key: 'Project',
          value: 'AuctionFlow',
        },
        {
          key: 'Environment',
          value: 'Production',
        },
      ],
    });

    // Create main branch
    const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'main',
      enableAutoBuild: true,
      enablePerformanceMode: true,
      enablePullRequestPreview: true,
      stage: 'PRODUCTION',
    });

    // Create development branch
    const devBranch = new amplify.CfnBranch(this, 'DevBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'develop',
      enableAutoBuild: true,
      enablePullRequestPreview: true,
      stage: 'DEVELOPMENT',
    });

    // Output the Amplify app URL
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.attrAppId,
      description: 'Amplify App ID',
    });

    new cdk.CfnOutput(this, 'AmplifyDomainUrl', {
      value: `https://main.${amplifyApp.attrDefaultDomain}`,
      description: 'Amplify Production App URL',
    });

    new cdk.CfnOutput(this, 'AmplifyDevDomainUrl', {
      value: `https://develop.${amplifyApp.attrDefaultDomain}`,
      description: 'Amplify Development App URL',
    });

    // IAM Role for Amplify build
    const amplifyRole = new iam.Role(this, 'AmplifyBuildRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
      ],
      roleName: 'AmplifyAuctionFlowBuildRole',
    });
  }
}