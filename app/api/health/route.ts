import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Test database connection
    try {
      const dbHealthy = await testConnection();
      healthCheck.database = {
        status: dbHealthy ? 'connected' : 'disconnected',
        checked_at: new Date().toISOString()
      };
    } catch (dbError) {
      healthCheck.database = {
        status: 'error',
        error: dbError instanceof Error ? dbError.message : 'Database connection failed',
        checked_at: new Date().toISOString()
      };
      healthCheck.status = 'degraded';
    }

    // Check required environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      healthCheck.environment_config = {
        status: 'missing_variables',
        missing: missingEnvVars
      };
      healthCheck.status = 'unhealthy';
    } else {
      healthCheck.environment_config = {
        status: 'configured'
      };
    }

    // Check Stripe configuration (optional for basic functionality)
    if (process.env.STRIPE_SECRET_KEY) {
      healthCheck.payments = {
        stripe: 'configured'
      };
    } else {
      healthCheck.payments = {
        stripe: 'not_configured'
      };
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}