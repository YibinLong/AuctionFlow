import { NextRequest } from 'next/server';
import { JWT } from 'next-auth/jwt';
import { z } from 'zod';

// Environment configuration
const COGNITO_USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// TODO: Implement proper JWT verification for Cognito
// For now, we'll use a simplified approach

// User role schema
const UserSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
  family_name: z.string().optional(),
  given_name: z.string().optional(),
  'cognito:groups': z.array(z.string()).optional(),
  'custom:role': z.enum(['admin', 'buyer', 'viewer']).optional(),
});

export type User = z.infer<typeof UserSchema>;

// Session management
export class SessionManager {
  private static sessions = new Map<string, { user: User; expiresAt: number }>();

  static createSession(user: User, expiresIn: number = 3600000): string { // 1 hour default
    const sessionId = this.generateSessionId();
    const expiresAt = Date.now() + expiresIn;

    this.sessions.set(sessionId, { user, expiresAt });
    return sessionId;
  }

  static getSession(sessionId: string): User | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.user;
  }

  static deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  static cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private static generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}

// Authentication middleware
export async function authenticate(req: NextRequest): Promise<{ user: User | null; error?: string }> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'No authorization token provided' };
    }

    const token = authHeader.substring(7);

    // For development without Cognito, allow mock authentication
    if (process.env.NODE_ENV === 'development' && !COGNITO_USER_POOL_ID) {
      return mockAuthentication(token);
    }

    // TODO: Implement proper JWT verification
    // For now, we'll use a simple mock implementation
    const payload = { sub: 'user', email: 'user@example.com' };
    const user = UserSchema.parse(payload);

    // Check if user has required role for admin routes
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin') ||
                       req.nextUrl.pathname.startsWith('/api/admin');

    if (isAdminRoute && !hasAdminRole(user)) {
      return { user: null, error: 'Insufficient permissions' };
    }

    return { user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { user: null, error: 'Invalid authentication token' };
  }
}

function hasAdminRole(user: User): boolean {
  // Check custom role first
  if (user['custom:role'] === 'admin') {
    return true;
  }

  // Check Cognito groups
  const groups = user['cognito:groups'] || [];
  return groups.includes('admin');
}

// Mock authentication for development
function mockAuthentication(token: string): { user: User | null; error?: string } {
  // Simple mock token format: "mock:email@example.com:admin"
  if (token.startsWith('mock:')) {
    const parts = token.split(':');
    if (parts.length >= 2) {
      const email = parts[1];
      const role = parts[2] || 'buyer';

      const mockUser: User = {
        sub: 'mock-user-id',
        email,
        email_verified: true,
        name: 'Mock User',
        'cognito:groups': role === 'admin' ? ['admin'] : ['buyer'],
        'custom:role': role as 'admin' | 'buyer' | 'viewer',
      };

      return { user: mockUser };
    }
  }

  return { user: null, error: 'Invalid mock token format' };
}

// Authorization helper functions
export function canAccessResource(user: User | null, resource: string, action: string): boolean {
  if (!user) {
    return false;
  }

  // Admin can do everything
  if (hasAdminRole(user)) {
    return true;
  }

  // Define resource-based permissions
  const permissions = {
    // Invoice access
    'invoice': {
      'read': ['buyer', 'viewer'],
      'create': ['admin'],
      'update': ['admin'],
      'delete': ['admin'],
    },
    // Payment access
    'payment': {
      'read': ['buyer', 'viewer'],
      'create': ['buyer'],
      'update': ['admin'],
    },
    // Reporting access
    'reports': {
      'read': ['admin', 'viewer'],
    },
    // Admin panel access
    'admin': {
      'read': ['admin'],
      'create': ['admin'],
      'update': ['admin'],
      'delete': ['admin'],
    },
  };

  const resourcePermissions = permissions[resource as keyof typeof permissions];
  if (!resourcePermissions) {
    return false;
  }

  const allowedRoles = resourcePermissions[action as keyof typeof resourcePermissions];
  if (!allowedRoles) {
    return false;
  }

  const userRole = user['custom:role'] || 'buyer';
  return allowedRoles.includes(userRole);
}

// Security utilities
export class SecurityUtils {
  // Sanitize input to prevent XSS
  static sanitize(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  // Generate CSRF token
  static generateCSRFToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  // Validate CSRF token
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken;
  }

  // Rate limiting by user
  static createUserRateLimiter() {
    const attempts = new Map<string, { count: number; resetTime: number }>();

    return (userId: string, maxAttempts: number = 10, windowMs: number = 60000): boolean => {
      const now = Date.now();
      const userAttempts = attempts.get(userId);

      if (!userAttempts || now > userAttempts.resetTime) {
        attempts.set(userId, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (userAttempts.count >= maxAttempts) {
        return false;
      }

      userAttempts.count++;
      return true;
    };
  }

  // Password policy validator
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// CORS configuration
export const corsConfig = {
  origin: process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:3001']
    : process.env.NEXT_PUBLIC_API_BASE_URL ? [process.env.NEXT_PUBLIC_API_BASE_URL] : [],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
};

export function getCORSHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (corsConfig.origin.length === 0 || corsConfig.origin.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && corsConfig.origin.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  headers['Access-Control-Allow-Methods'] = corsConfig.methods.join(', ');
  headers['Access-Control-Allow-Headers'] = corsConfig.allowedHeaders.join(', ');
  headers['Access-Control-Allow-Credentials'] = corsConfig.credentials.toString();

  return headers;
}