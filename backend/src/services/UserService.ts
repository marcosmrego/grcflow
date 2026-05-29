import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './AuthService';
import { userRepository } from '../repositories/UserRepository';
import {
  User,
  AuthTokens,
  UserPayload,
  ValidationError,
  AuthenticationError,
  ConflictError,
} from '../models/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  passwordConfirm?: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserPayload;
}

/**
 * User Service
 * Handles user authentication and management
 */
export class UserService {
  /**
   * Login user
   */
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user
    const user = await userRepository.findByEmail(email.toLowerCase());

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.is_active) {
      throw new AuthenticationError('User account is disabled');
    }

    // Verify password
    const passwordValid = await AuthService.verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = AuthService.generateAuthTokens(user);

    return {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Register new user
   */
  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { email, name, password, passwordConfirm } = registerData;

    // Validate input
    if (!email || !name || !password) {
      throw new ValidationError('Email, name and password are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (passwordConfirm && password !== passwordConfirm) {
      throw new ValidationError('Passwords do not match');
    }

    // Check if email already exists
    const emailExists = await userRepository.emailExists(email);
    if (emailExists) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(password);

    // Create user
    const user = await userRepository.create({
      id: uuidv4(),
      email: email.toLowerCase(),
      name: name.trim(),
      password_hash: passwordHash,
      role: 'viewer', // Default role for new users
      is_active: true,
    });

    // Generate tokens
    const tokens = AuthService.generateAuthTokens(user);

    return {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    // Verify refresh token
    const decoded = AuthService.verifyRefreshToken(refreshToken);

    if (!decoded) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Get user
    const user = await userRepository.findById(decoded.sub);

    if (!user || !user.is_active) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Generate new access token
    const newToken = AuthService.generateAccessToken(user);

    return { token: newToken };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserPayload> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: { name?: string }): Promise<UserPayload> {
    const user = await userRepository.update(userId, {
      name: updates.name?.trim(),
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current and new password are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Get user
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Verify current password
    const passwordValid = await AuthService.verifyPassword(currentPassword, user.password_hash);

    if (!passwordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await AuthService.hashPassword(newPassword);

    // Update password
    await userRepository.update(userId, {
      password_hash: newPasswordHash,
    });
  }

  /**
   * Get all users (admin only)
   */
  async listUsers(limit: number = 20, offset: number = 0): Promise<{
    users: UserPayload[];
    total: number;
  }> {
    const { users, total } = await userRepository.listActive(limit, offset);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      })),
      total,
    };
  }

  /**
   * Create user (admin only)
   */
  async createUser(data: {
    email: string;
    name: string;
    role: 'admin' | 'editor' | 'viewer';
    password?: string;
  }): Promise<UserPayload> {
    // Validate
    if (!data.email || !data.name) {
      throw new ValidationError('Email and name are required');
    }

    // Check if email exists
    const emailExists = await userRepository.emailExists(data.email);
    if (emailExists) {
      throw new ConflictError('Email already registered');
    }

    // Hash a temporary password or provided password
    const tempPassword = data.password || `Temp${uuidv4().slice(0, 8)}!`;
    const passwordHash = await AuthService.hashPassword(tempPassword);

    // Create user
    const user = await userRepository.create({
      id: uuidv4(),
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      password_hash: passwordHash,
      role: data.role,
      is_active: true,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId: string, updates: {
    name?: string;
    role?: 'admin' | 'editor' | 'viewer';
    is_active?: boolean;
  }): Promise<UserPayload> {
    const user = await userRepository.update(userId, {
      name: updates.name?.trim(),
      role: updates.role,
      is_active: updates.is_active,
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Delete user (admin only - soft delete)
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    await userRepository.softDelete(userId, deletedBy);
  }
}

export const userService = new UserService();
