import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';

export class SimpleAuctionFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Cognito User Pool (simplified)
    const userPool = new cognito.UserPool(this, 'AuctionFlowUserPool', {
      userPoolName: 'auction-flow-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create user pool client
    const userPoolClient = new cognito.UserPoolClient(this, 'AuctionFlowUserPoolClient', {
      userPool: userPool,
      userPoolClientName: 'auction-flow-web',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Create S3 bucket for storage
    const storageBucket = new s3.Bucket(this, 'AuctionFlowStorage', {
      bucketName: `auction-flow-simple-${this.account}-${Date.now().toString().slice(-6)}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
    });

    // Get GitHub token for Amplify
    const githubTokenSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubTokenSecret', 'github-token');

    // Create Amplify app
    const amplifyApp = new amplify.CfnApp(this, 'AuctionFlowApp', {
      name: 'auction-flow-simple',
      description: 'AuctionFlow - Modern Auction Checkout System (Simplified)',
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

    // IAM Role for Amplify build
    const amplifyRole = new iam.Role(this, 'AmplifyBuildRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
      ],
      roleName: 'AmplifyAuctionFlowSimpleBuildRole',
    });

    // Output the configuration
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.attrAppId,
      description: 'Amplify App ID',
    });

    new cdk.CfnOutput(this, 'AmplifyDomainUrl', {
      value: `https://main.${amplifyApp.attrDefaultDomain}`,
      description: 'Amplify Production App URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'StorageBucketName', {
      value: storageBucket.bucketName,
      description: 'S3 Storage Bucket Name',
    });
  }
}