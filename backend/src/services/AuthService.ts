import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { User, JWTPayload, AuthTokens, UserPayload, SystemUser, SystemJWTPayload, SystemUserPayload } from '../models/types';

/**
 * Authentication service
 * Handles JWT token generation, password hashing, and token verification
 * for both company users (tenants) and system users (platform operators)
 */
export class AuthService {
  /**
   * Generate JWT access token for a company user
   */
  static generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      sub: user.id,
      companyId: user.company_id,
      email: user.email,
      role: user.role,
      isMaster: user.is_master ?? false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    return jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate a short-lived access token for the public demo session (POST /api/demo/login).
   * Role is forced to 'editor' in the payload regardless of the seeded user's DB role, as
   * defense in depth — even if that row were ever changed, this token could never carry
   * MANAGE_USERS/MANAGE_ROLES/VIEW_AUDIT_LOGS permissions. The demo account can still decide
   * any approval alçada despite being 'editor': KnowledgeService.decideApproval bypasses the
   * approval_group restriction for any company flagged is_demo, not based on role.
   */
  static generateDemoAccessToken(user: User): string {
    const payload: JWTPayload = {
      sub: user.id,
      companyId: user.company_id,
      email: user.email,
      role: 'editor',
      isMaster: false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60, // 4 hours
    };

    return jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate JWT refresh token for a company user
   */
  static generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };

    return jwt.sign(payload, config.jwt.secret + '_refresh', {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate both access and refresh tokens for a company user
   */
  static generateAuthTokens(user: User): AuthTokens {
    return {
      token: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verify JWT token of a company user
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): any | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret + '_refresh');
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate JWT access token for a system (platform) user.
   * Uses a distinct payload shape (no companyId) so authMiddleware/systemAuthMiddleware
   * can tell company tokens and system tokens apart.
   */
  static generateSystemAccessToken(user: SystemUser): string {
    const payload: SystemJWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isMaster: user.is_master ?? false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    return jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate JWT refresh token for a system user
   */
  static generateSystemRefreshToken(user: SystemUser): string {
    const payload = {
      sub: user.id,
      type: 'system_refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };

    return jwt.sign(payload, config.jwt.secret + '_refresh', {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate both access and refresh tokens for a system user
   */
  static generateSystemAuthTokens(user: SystemUser): AuthTokens {
    return {
      token: this.generateSystemAccessToken(user),
      refreshToken: this.generateSystemRefreshToken(user),
    };
  }

  /**
   * Verify JWT token of a system user. Rejects tokens that carry a companyId,
   * since those belong to company users, not platform operators.
   */
  static verifySystemToken(token: string): SystemJWTPayload | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload | SystemJWTPayload;
      if ('companyId' in payload) return null;
      return payload as SystemJWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  /**
   * Extract user info from token (without verification)
   */
  static extractUserFromToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static toUserPayload(user: User): UserPayload {
    return {
      id: user.id,
      companyId: user.company_id,
      email: user.email,
      name: user.name,
      role: user.role,
      isMaster: user.is_master ?? false,
    };
  }

  static toSystemUserPayload(user: SystemUser): SystemUserPayload {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isMaster: user.is_master ?? false,
    };
  }
}
