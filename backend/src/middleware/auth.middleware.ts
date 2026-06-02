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

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let localUser = await prisma.user.findUnique({
      where: { email: 'local@passbook.com' }
    });

    if (!localUser) {
      localUser = await prisma.user.create({
        data: {
          id: 'local-user',
          email: 'local@passbook.com',
          passwordHash: 'local_pass_hash_dummy',
          name: 'Local User',
          role: 'USER'
        }
      });
    }

    req.user = {
      id: localUser.id,
      email: localUser.email,
      role: localUser.role as 'USER' | 'ADMIN',
      name: localUser.name
    };
    next();
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
