import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as alarms from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class AuctionFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC for backend services
    const vpc = new ec2.Vpc(this, 'AuctionFlowVPC', {
      maxAzs: 2, // Multi-AZ for high availability
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Create Cognito User Pool
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
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 20,
        }),
      },
    });

    // Create admin and buyer groups
    const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admin',
      description: 'Administrators with full access',
      precedence: 0,
    });

    const buyerGroup = new cognito.CfnUserPoolGroup(this, 'BuyerGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'buyer',
      description: 'Regular buyers',
      precedence: 1,
    });

    // Create Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'AuctionFlowUserPoolClient', {
      userPool: userPool,
      userPoolClientName: 'auction-flow-web',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/api/auth/callback/cognito',
          'https://main.d1abcdefg123.amplifyapp.com/api/auth/callback/cognito',
        ],
        logoutUrls: [
          'http://localhost:3000/admin/login',
          'https://main.d1abcdefg123.amplifyapp.com/admin/login',
        ],
      },
    });

    // Create Cognito Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, 'AuctionFlowIdentityPool', {
      identityPoolName: 'auction-flow-identity',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName,
      }],
    });

    // Database temporarily removed for faster deployment
    // Will deploy database separately after infrastructure is up
    // const dbInstance = new rds.DatabaseInstance(this, 'AuctionFlowDB', {

    // Redis/ElastiCache temporarily removed for simplified deployment
    // Can be added later when needed for caching

    // Create S3 bucket for file uploads
    const storageBucket = new s3.Bucket(this, 'AuctionFlowStorage', {
      bucketName: `auction-flow-storage-${this.account}-${Date.now().toString().slice(-6)}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Create CloudWatch alarms for monitoring
    const alarmTopic = new sns.Topic(this, 'AuctionFlowAlarms', {
      displayName: 'AuctionFlow System Alarms',
    });

    // Add email subscription to alarms (configure your email)
    if (process.env.ALARM_EMAIL) {
      alarmTopic.addSubscription(new subscriptions.EmailSubscription(process.env.ALARM_EMAIL));
    }

    // CPU Utilization Alarm for RDS
    const dbCpuAlarm = new cloudwatch.Alarm(this, 'DBCpuAlarm', {
      metric: dbInstance.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dbCpuAlarm.addAlarmAction(new alarms.SnsAction(alarmTopic));

    // Memory Utilization Alarm for RDS
    const dbMemoryAlarm = new cloudwatch.Alarm(this, 'DBMemoryAlarm', {
      metric: dbInstance.metricFreeableMemory(),
      threshold: 100 * 1024 * 1024, // 100MB
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dbMemoryAlarm.addAlarmAction(new alarms.SnsAction(alarmTopic));

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

    // Output Cognito configuration
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoIssuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      description: 'Cognito JWT Issuer URL',
    });

    // Output Database configuration
    new cdk.CfnOutput(this, 'DatabaseHost', {
      value: dbInstance.instanceEndpoint.hostname,
      description: 'RDS Database Host',
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: dbInstance.instanceEndpoint.port.toString(),
      description: 'RDS Database Port',
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: 'auctionflow',
      description: 'RDS Database Name',
    });

    // Redis configuration outputs removed (Redis temporarily disabled)

    // Output Storage configuration
    new cdk.CfnOutput(this, 'StorageBucketName', {
      value: storageBucket.bucketName,
      description: 'S3 Storage Bucket Name',
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