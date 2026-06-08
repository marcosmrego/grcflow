import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './AuthService';
import { systemUserRepository } from '../repositories/SystemUserRepository';
import { AuthTokens, SystemUserPayload, SystemUserRole } from '../models/types';
import { ValidationError, AuthenticationError, ConflictError, NotFoundError } from '../middleware';

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: SystemUserPayload;
}

/**
 * System User Service
 * Handles authentication and management of platform (system) users.
 * Mirrors UserService but without any company concept — there is no public
 * self-registration, only super_admins create new system users.
 */
export class SystemUserService {
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginData;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await systemUserRepository.findByEmail(email.toLowerCase());

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.is_active) {
      throw new AuthenticationError('User account is disabled');
    }

    const passwordValid = await AuthService.verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    await systemUserRepository.updateLastLogin(user.id);

    const tokens = AuthService.generateSystemAuthTokens(user);

    return {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: AuthService.toSystemUserPayload(user),
    };
  }

  async getProfile(userId: string): Promise<SystemUserPayload> {
    const user = await systemUserRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return AuthService.toSystemUserPayload(user);
  }

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

    const user = await systemUserRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const passwordValid = await AuthService.verifyPassword(currentPassword, user.password_hash);

    if (!passwordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newPasswordHash = await AuthService.hashPassword(newPassword);

    await systemUserRepository.update(userId, {
      password_hash: newPasswordHash,
    });
  }

  async listUsers(limit: number = 20, offset: number = 0): Promise<{ users: SystemUserPayload[]; total: number }> {
    const { users, total } = await systemUserRepository.listActive(limit, offset);

    return {
      users: users.map((user) => AuthService.toSystemUserPayload(user)),
      total,
    };
  }

  async createUser(data: {
    email: string;
    name: string;
    role: SystemUserRole;
    password: string;
  }): Promise<SystemUserPayload> {
    if (!data.email || !data.name || !data.password) {
      throw new ValidationError('Email, name and password are required');
    }

    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const emailExists = await systemUserRepository.emailExists(data.email);
    if (emailExists) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await AuthService.hashPassword(data.password);

    const user = await systemUserRepository.create({
      id: uuidv4(),
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      password_hash: passwordHash,
      role: data.role,
      is_active: true,
    });

    return AuthService.toSystemUserPayload(user);
  }

  async updateUser(userId: string, updates: {
    name?: string;
    role?: SystemUserRole;
    is_active?: boolean;
  }): Promise<SystemUserPayload> {
    const user = await systemUserRepository.update(userId, {
      name: updates.name?.trim(),
      role: updates.role,
      is_active: updates.is_active,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return AuthService.toSystemUserPayload(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await systemUserRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await systemUserRepository.softDelete(userId);
  }
}

export const systemUserService = new SystemUserService();
