# AuctionFlow AWS Deployment Guide

> **🤖 AI Agent-Friendly Guide**: This guide is specifically designed for agentic LLMs to deploy AuctionFlow features to AWS with minimal human intervention.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Deployment Types](#deployment-types)
4. [Frontend Deployment (Static)](#frontend-deployment-static)
5. [Backend Deployment (Serverless)](#backend-deployment-serverless)
6. [Database Setup](#database-setup)
7. [Environment Configuration](#environment-configuration)
8. [Testing & Validation](#testing--validation)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## 🚀 Prerequisites

### Required AWS Services
- AWS CLI (configured with proper permissions)
- Amplify Console (for frontend hosting)
- Lambda Functions (for API endpoints)
- RDS PostgreSQL (for database)
- S3 (for static assets)
- CloudFront (for CDN)
- IAM (for permissions)

### Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
# Enter: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, Default region, Default output format
```

### Required Permissions
Ensure your AWS IAM user has:
- `AmplifyAdmin` access
- `LambdaFullAccess`
- `RDSFullAccess`
- `S3FullAccess`
- `CloudFrontFullAccess`
- `IAMFullAccess`

---

## 🏗️ Project Structure

```
AuctionFlow/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (for serverless deployment)
│   ├── admin/             # Admin dashboard pages
│   ├── checkout/          # Checkout flow
│   ├── invoice/           # Invoice pages
│   └── payment/           # Payment pages
├── components/            # React components
├── lib/                   # Utilities and core logic
│   ├── calculations.ts    # Financial calculations
│   ├── db.ts             # Database connection
│   ├── audit-logger.ts   # Audit logging
│   └── types.ts          # TypeScript types
├── database/              # Database schema and migrations
│   ├── schema.sql         # Complete database schema
│   └── migrate.sql        # Migration scripts
└── public/                # Static assets
```

---

## 🎯 Deployment Types

### 1. Frontend-Only Deployment (Static)
**Use Case**: UI/UX updates, new pages, component changes
**Platform**: AWS Amplify Static Hosting
**Build Time**: 2-5 minutes

### 2. Backend-Only Deployment (Serverless)
**Use Case**: New API endpoints, business logic changes
**Platform**: AWS Lambda Functions
**Build Time**: 5-10 minutes

### 3. Full-Stack Deployment
**Use Case**: Complete features with frontend + backend
**Platform**: Amplify + Lambda + RDS
**Build Time**: 10-15 minutes

---

## 🖥️ Frontend Deployment (Static)

### Step 1: Verify Build Compatibility
```bash
# Check if build contains API routes
ls app/api/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "⚠️  API routes detected. Move them temporarily for static deployment."
    mv app/api app/api_backup
fi
```

### Step 2: Update Next.js Configuration
Ensure `next.config.ts` is configured for static export:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  distDir: 'out',
  output: 'export',
};

export default nextConfig;
```

### Step 3: Test Local Build
```bash
# Clean and rebuild
rm -rf .next out
npm run build

# Verify static export success
if [ $? -eq 0 ]; then
    echo "✅ Static build successful"
else
    echo "❌ Static build failed"
    exit 1
fi
```

### Step 4: Deploy to Amplify
```bash
# Get Amplify app ID (replace with your app ID)
APP_ID="d9i1hvy2mt5lg"
BRANCH="main"

# Commit changes
git add .
git commit -m "feat: [FEATURE_NAME] - [BRIEF_DESCRIPTION]

🤖 Generated with AI Deployment Guide

Co-Authored-By: AI Agent <noreply@anthropic.com>"

git push origin main

# Monitor deployment
echo "🚀 Deployment started. Monitoring progress..."
for i in {1..12}; do
    sleep 30
    STATUS=$(aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $(aws amplify list-jobs --app-id $APP_ID --branch-name $BRANCH --query 'jobs[0].jobId' --output text) --query 'job.summary.status' --output text 2>/dev/null)

    if [ "$STATUS" = "SUCCEED" ]; then
        echo "✅ Deployment successful!"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ Deployment failed!"
        aws amplify get-job --app-id $APP_ID --branch-name $BRANCH --job-id $(aws amplify list-jobs --app-id $APP_ID --branch-name $BRANCH --query 'jobs[0].jobId' --output text) --query 'job.steps[?stepName==`BUILD`].logUrl' --output text
        exit 1
    fi

    echo "⏳ Deployment in progress... ($i/12)"
done
```

### Step 5: Validate Deployment
```bash
# Test key pages
APP_URL="https://main.d9i1hvy2mt5lg.amplifyapp.com"

curl -f -s "$APP_URL/" > /dev/null && echo "✅ Homepage OK" || echo "❌ Homepage Failed"
curl -f -s "$APP_URL/admin/" > /dev/null && echo "✅ Admin OK" || echo "❌ Admin Failed"
curl -f -s "$APP_URL/invoice/sample1/" > /dev/null && echo "✅ Invoice OK" || echo "❌ Invoice Failed"
```

---

## ⚙️ Backend Deployment (Serverless)

### Step 1: Prepare API Routes
```bash
# Ensure API routes exist
if [ ! -d "app/api" ]; then
    if [ -d "app/api_backup" ]; then
        mv app/api_backup app/api
    else
        echo "❌ No API routes found"
        exit 1
    fi
fi
```

### Step 2: Configure Lambda Functions
For each API route, create a Lambda function:

```bash
# Example: Deploy invoices API
API_ROUTE="app/api/invoices"
FUNCTION_NAME="auctionflow-invoices"

# Create Lambda deployment package
mkdir -p lambda_deployment
cd lambda_deployment

# Copy dependencies
cp -r ../node_modules .
cp -r ../lib .
cp -r ../database .

# Create Lambda handler for the route
cat > handler.js << 'EOF'
const { query } = require('./lib/db');
const { calculateInvoiceTotals } = require('./lib/calculations');

exports.handler = async (event) => {
  try {
    // Lambda function logic here
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: "AuctionFlow API" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
EOF

# Create deployment package
zip -r function.zip .

# Deploy Lambda
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime nodejs18.x \
  --role arn:aws:iam::971422717446:role/lambda-execution-role \
  --handler handler.handler \
  --zip-file fileb://function.zip \
  --environment Variables="{NODE_ENV=production}"

cd ..
```

### Step 3: Set Up API Gateway
```bash
# Create API Gateway
API_ID=$(aws apigateway create-rest-api --name 'auctionflow-api' --query 'id' --output text)

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# Create resource for each API route
for route in invoices calculations payments; do
    RESOURCE_ID=$(aws apigateway create-resource \
      --rest-api-id $API_ID \
      --parent-id $ROOT_ID \
      --path-part $route \
      --query 'id' --output text)

    echo "Created resource: $route -> $RESOURCE_ID"
done
```

---

## 🗄️ Database Setup

### Step 1: Create RDS PostgreSQL Instance
```bash
# Create DB subnet group (if not exists)
aws rds create-db-subnet-group \
  --db-subnet-group-name auctionflow-subnet-group \
  --db-subnet-group-description "Subnet group for AuctionFlow" \
  --subnet-ids subnet-12345678 subnet-87654321

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier auctionflow-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username auctionflow \
  --master-user-password $(openssl rand -base64 32) \
  --allocated-storage 20 \
  --db-subnet-group-name auctionflow-subnet-group \
  --vpc-security-group-ids sg-12345678 \
  --backup-retention-period 7 \
  --multi-az \
  --publicly-accessible
```

### Step 2: Run Database Schema
```bash
# Wait for DB to be available
aws rds wait db-instance-available --db-instance-identifier auctionflow-db

# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier auctionflow-db --query 'DBInstances[0].Endpoint.Address' --output text)

# Connect and run schema
psql -h $DB_ENDPOINT -U auctionflow -d postgres -f database/schema.sql
```

### Step 3: Configure Environment Variables
```bash
# Update Lambda environment variables
for function in auctionflow-invoices auctionflow-calculations auctionflow-payments; do
    aws lambda update-function-configuration \
      --function-name $function \
      --environment Variables="{
        DATABASE_URL=postgresql://auctionflow:PASSWORD@$DB_ENDPOINT:5432/auctionflow,
        NODE_ENV=production,
        STRIPE_SECRET_KEY=sk_test_...
      }"
done
```

---

## 🔧 Environment Configuration

### Amplify Environment Variables
```bash
# Set production environment variables
aws amplify update-app --app-id d9i1hvy2mt5lg --environment-variables '{
  "NODE_ENV": "production",
  "NEXT_PUBLIC_API_URL": "https://api.auctionflow.com",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_..."
}'
```

### Lambda Environment Variables
```bash
# Secure variables (store in AWS Secrets Manager)
aws secretsmanager create-secret \
  --name auctionflow/production \
  --secret-string '{
    "DATABASE_URL": "postgresql://...",
    "STRIPE_SECRET_KEY": "sk_test_...",
    "STRIPE_WEBHOOK_SECRET": "whsec_..."
  }'
```

---

## ✅ Testing & Validation

### Frontend Testing
```bash
# Automated frontend testing
URL="https://main.d9i1hvy2mt5lg.amplifyapp.com"

# Test all major pages
PAGES=("/" "/admin/" "/checkout" "/invoice/sample1/" "/payment")
for page in "${PAGES[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL$page")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $page - $HTTP_CODE"
    else
        echo "❌ $page - $HTTP_CODE"
    fi
done
```

### Backend Testing
```bash
# Test API endpoints
API_BASE="https://api.auctionflow.com"

# Test health endpoint
curl -f "$API_BASE/health" && echo "✅ API Health OK" || echo "❌ API Health Failed"

# Test invoices endpoint
curl -f "$API_BASE/api/invoices" && echo "✅ Invoices API OK" || echo "❌ Invoices API Failed"
```

### Database Testing
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;" && echo "✅ DB Connection OK" || echo "❌ DB Connection Failed"
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Amplify Build Failures
```bash
# Check build logs
JOB_ID=$(aws amplify list-jobs --app-id d9i1hvy2mt5lg --branch-name main --query 'jobs[0].jobId' --output text)
aws amplify get-job --app-id d9i1hvy2mt5lg --branch-name main --job-id $JOB_ID --query 'job.steps[?stepName==`BUILD`].logUrl' --output text

# Common fixes:
# - Move API routes: mv app/api app/api_backup
# - Update next.config.ts for static export
# - Check for TypeScript errors
```

#### 2. Lambda Function Timeouts
```bash
# Increase timeout
aws lambda update-function-configuration \
  --function-name auctionflow-invoices \
  --timeout 30
```

#### 3. Database Connection Issues
```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids sg-12345678

# Update security group to allow Lambda access
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 5432 \
  --source-security-group-ids sg-lambda-sg
```

#### 4. API Gateway Issues
```bash
# Check API Gateway logs
aws logs describe-log-groups --log-group-name-prefix /aws/apigateway

# Enable CORS
aws apigateway update-rest-api \
  --rest-api-id $API_ID \
  --patch-operations op=replace,path=/binaryMediaTypes,value='*/*'
```

---

## 🔄 Rollback Procedures

### Frontend Rollback
```bash
# Rollback to previous commit
git log --oneline -10
git revert HEAD  # or git checkout COMMIT_HASH

# Trigger redeployment
aws amplify start-job --app-id d9i1hvy2mt5lg --branch-name main --job-type RELEASE
```

### Backend Rollback
```bash
# Deploy previous Lambda version
aws lambda publish-version --function-name auctionflow-invoices --description "Rollback version"
aws lambda update-alias --function-name auctionflow-invoices --name production --function-version 1

# Database rollback
psql $DATABASE_URL -f database/rollback_schema.sql
```

---

## 📋 Deployment Checklist

### Pre-Deployment Checklist
- [ ] Code reviewed and tested locally
- [ ] Environment variables configured
- [ ] Database schema updated (if needed)
- [ ] Security groups configured
- [ ] Backup current version
- [ ] Documentation updated

### Post-Deployment Checklist
- [ ] Deployment successful
- [ ] All pages accessible (HTTP 200)
- [ ] API endpoints responding
- [ ] Database connectivity verified
- [ ] Error logs checked
- [ ] Performance monitored
- [ ] Rollback plan documented

---

## 🚀 Quick Deployment Commands

### Frontend Only
```bash
# One-command frontend deployment
deploy_frontend() {
    mv app/api app/api_backup 2>/dev/null || true
    npm run build && \
    git add . && \
    git commit -m "feat: $1" && \
    git push origin main && \
    aws amplify start-job --app-id d9i1hvy2mt5lg --branch-name main --job-type RELEASE
}

# Usage: deploy_frontend "Added new dashboard features"
```

### Full Stack
```bash
# One-command full-stack deployment
deploy_full_stack() {
    # Deploy backend
    deploy_lambda_functions
    update_api_gateway

    # Deploy frontend
    deploy_frontend "$1"

    # Run database migrations
    run_database_migrations

    # Update environment variables
    update_production_env
}
```

---

## 📞 Support & Monitoring

### Monitoring Commands
```bash
# Check Amplify deployment status
watch -n 30 'aws amplify get-job --app-id d9i1hvy2mt5lg --branch-name main --job-id $(aws amplify list-jobs --app-id d9i1hvy2mt5lg --branch-name main --query "jobs[0].jobId" --output text) --query "job.summary.status" --output text'

# Monitor Lambda functions
aws logs tail /aws/lambda/auctionflow-invoices --follow

# Check database performance
aws rds describe-db-instances --db-instance-identifier auctionflow-db --query 'DBInstances[0].DBInstanceStatus'
```

### Alert Setup
```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "AuctionFlow-HighErrorRate" \
  --alarm-description "High error rate in AuctionFlow API" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## 🎉 Success Criteria

A deployment is considered successful when:

1. ✅ All tests pass locally
2. ✅ Frontend builds without errors
3. ✅ Amplify deployment succeeds
4. ✅ All pages return HTTP 200
5. ✅ API endpoints respond correctly
6. ✅ Database operations work
7. ✅ Error logs are clean
8. ✅ Performance metrics are acceptable

---

**🤖 This guide is designed to be executed step-by-step by AI agents. Each section includes error handling and validation to ensure reliable deployments.**

**Last Updated:** 2025-11-11
**Version:** 1.0
**Compatible with:** AWS CLI v2, Node.js 18+, Next.js 16+