#!/bin/bash

# Database Setup Script for AuctionFlow
# This script sets up the PostgreSQL database with schema and sample data

echo "🚀 Setting up AuctionFlow Database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Database connection details
DB_NAME="auctionflow"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "📋 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Create database if it doesn't exist
echo ""
echo "📦 Creating database..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists"

# Run schema setup
echo ""
echo "🏗️  Setting up database schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

# Run migrations with sample data
echo ""
echo "📝 Running migrations and inserting sample data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/migrate.sql

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Failed to run migrations"
    exit 1
fi

echo ""
echo "🎉 Database setup completed!"
echo ""
echo "📊 Sample data created:"
echo "  - 5 auction items"
echo "  - 3 sample invoices"
echo "  - Sample system settings"
echo ""
echo "🔗 You can now test the application:"
echo "  - Start development server: npm run dev"
echo "  - Visit invoice pages: /invoice/[id] (use sample IDs from database)"
echo ""
echo "💡 To view sample invoice IDs:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT id, invoice_number FROM invoices;\""