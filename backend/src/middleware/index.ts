// Auth middlewares
export {
  authMiddleware,
  optionalAuthMiddleware,
  requireAuth,
  systemAuthMiddleware,
  requireSystemAuth,
} from './auth';

// RBAC middlewares
export {
  hasPermission,
  requirePermission,
  requireAdmin,
  requireEditor,
  requireMaster,
  requireAnyPermission,
  requireAllPermissions,
  requireSystemRole,
  requireSystemAdmin,
  rolePermissions,
} from './rbac';

// Audit middlewares
export { auditContextMiddleware, asyncHandler } from './audit';

// Module-gating middleware (SaaS — acesso por módulo contratado)
export { requireModule } from './modules';

// Rate limiting middlewares
export {
  generalLimiter,
  authLimiter,
  moderateLimiter,
  uploadLimiter,
  publicLimiter,
} from './rateLimit';

// Error handling
export {
  errorHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from './errorHandler';
