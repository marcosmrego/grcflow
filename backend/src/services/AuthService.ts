import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { User, JWTPayload, AuthTokens, UserPayload } from '../models/types';

/**
 * Authentication service
 * Handles JWT token generation, password hashing, and token verification
 */
export class AuthService {
  /**
   * Generate JWT access token
   */
  static generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    return jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate JWT refresh token
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
   * Generate both access and refresh tokens
   */
  static generateAuthTokens(user: User): AuthTokens {
    return {
      token: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Verify JWT token
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
}
