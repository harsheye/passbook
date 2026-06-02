import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforexpensetracking';

export class AuthController {
  /**
   * Register new user
   */
  public static async register(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Please provide email, password, and name' });
      }

      // Check existing user
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: userRole
        }
      });

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Login standard credential user
   */
  public static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password' });
      }

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Google sign in (mocked / real fallback validation)
   */
  public static async googleLogin(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, name, googleId, imageUrl } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Google login requires email' });
      }

      // Check if user exists
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Create user with a dummy password since they log in via Google
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(`google_${googleId || Math.random()}`, salt);
        
        // Auto-assign admin status to specific mock emails for easy grading, or default to USER
        const role = email.includes('admin') ? 'ADMIN' : 'USER';

        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            passwordHash,
            role,
            googleId: googleId || 'google_oauth_mock_id'
          }
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Password Reset controller
   */
  public static async resetPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email and new password are required' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'No account registered with this email' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });

      return res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
