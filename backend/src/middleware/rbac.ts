import { Request, Response, NextFunction } from 'express';
import { Permission, RolePermissions, UserRole } from '../models/types';

/**
 * Define role-based permissions
 */
export const rolePermissions: RolePermissions = {
  admin: [
    // Knowledge
    'CREATE_KNOWLEDGE',
    'READ_KNOWLEDGE',
    'UPDATE_KNOWLEDGE',
    'DELETE_KNOWLEDGE',
    // Flows
    'CREATE_FLOW',
    'READ_FLOW',
    'UPDATE_FLOW',
    'DELETE_FLOW',
    'EXECUTE_FLOW',
    // Management
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'VIEW_AUDIT_LOGS',
  ],
  editor: [
    // Knowledge
    'CREATE_KNOWLEDGE',
    'READ_KNOWLEDGE',
    'UPDATE_KNOWLEDGE',
    'DELETE_KNOWLEDGE',
    // Flows
    'CREATE_FLOW',
    'READ_FLOW',
    'UPDATE_FLOW',
    'EXECUTE_FLOW',
  ],
  viewer: [
    // Knowledge (read-only)
    'READ_KNOWLEDGE',
    // Flows (read-only)
    'READ_FLOW',
  ],
};

/**
 * Check if user has required permission
 */
export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  const permissions = rolePermissions[userRole];
  return permissions.includes(permission);
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Required: ${permission}`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }

  next();
};

/**
 * Middleware to require editor or admin role
 */
export const requireEditor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (!['admin', 'editor'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Editor or Admin access required',
      },
    });
  }

  next();
};

/**
 * Middleware to require one of multiple permissions
 */
export const requireAnyPermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const hasAny = permissions.some((permission) => hasPermission(req.user!.role, permission));

    if (!hasAny) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Required any of: ${permissions.join(', ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Middleware to require all permissions
 */
export const requireAllPermissions = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const hasAll = permissions.every((permission) => hasPermission(req.user!.role, permission));

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Required all of: ${permissions.join(', ')}`,
        },
      });
    }

    next();
  };
};
