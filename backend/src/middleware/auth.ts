import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'TRAINER';
  permissions?: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware para verificar token JWT
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user as AuthUser;
    next();
  });
}

/**
 * Middleware para verificar que el usuario tiene rol ADMIN
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Se requiere rol de administrador' });
  }
  next();
}

/**
 * Middleware para verificar que el usuario tiene un permiso específico
 * @param permission - Código del permiso requerido (ej: 'members.view')
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Los administradores tienen todos los permisos
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Verificar si el usuario tiene el permiso específico
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'No tienes permiso para realizar esta acción',
        requiredPermission: permission 
      });
    }
    
    next();
  };
}

/**
 * Middleware para verificar que el usuario tiene al menos uno de los permisos
 * @param permissions - Array de códigos de permisos (se requiere al menos uno)
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Los administradores tienen todos los permisos
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Verificar si el usuario tiene al menos uno de los permisos
    const hasPermission = permissions.some(
      p => req.user?.permissions && req.user.permissions.includes(p)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'No tienes permiso para realizar esta acción',
        requiredPermissions: permissions 
      });
    }
    
    next();
  };
}

/**
 * Middleware para verificar que el usuario tiene TODOS los permisos especificados
 * @param permissions - Array de códigos de permisos (se requieren todos)
 */
export function requireAllPermissions(permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Los administradores tienen todos los permisos
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Verificar si el usuario tiene todos los permisos
    const hasAllPermissions = permissions.every(
      p => req.user?.permissions && req.user.permissions.includes(p)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({ 
        error: 'No tienes todos los permisos requeridos',
        requiredPermissions: permissions 
      });
    }
    
    next();
  };
}
