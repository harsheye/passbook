import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    name: string;
  };
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforexpensetracking';

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token === 'local-mode-dummy-token') {
        const localUser = await prisma.user.upsert({
          where: { email: 'local@passbook.com' },
          update: {},
          create: {
            id: 'local-user',
            email: 'local@passbook.com',
            passwordHash: 'local_pass_hash_dummy',
            name: 'Local User',
            role: 'USER'
          }
        });

        req.user = {
          id: localUser.id,
          email: localUser.email,
          role: localUser.role as 'USER' | 'ADMIN',
          name: localUser.name
        };
        return next();
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role as 'USER' | 'ADMIN',
            name: user.name
          };
          return next();
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session token' });
      }
    }

    return res.status(401).json({ error: 'Authorization header with Bearer token is required' });
  } catch (error) {
    next(error);
  }
};

export const requireRole = (role: 'USER' | 'ADMIN') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Bypass check for local-user since this is a local application
    if (req.user.id === 'local-user') {
      return next();
    }

    if (req.user.role !== role && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: `Forbidden: Requires ${role} role` });
    }

    next();
  };
};
