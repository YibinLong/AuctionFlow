#!/bin/bash

# =============================================================================
# AuctionFlow AWS Destroy Script
# =============================================================================

set -e

echo "⚠️  WARNING: This will destroy all AWS resources created for AuctionFlow!"
echo "This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "❌ Destruction cancelled."
    exit 1
fi

echo "🗑️  Destroying AWS infrastructure..."
npm run cdk:destroy

echo "✅ AWS infrastructure destroyed successfully!"