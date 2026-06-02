import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CategoryController {
  /**
   * List all categories sorted by name
   */
  public static async list(req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc'
        }
      });
      return res.json(categories);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create a new category
   */
  public static async create(req: Request, res: Response) {
    try {
      const { name, icon, color } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const existing = await prisma.category.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(400).json({ error: 'Category name already exists' });
      }

      const category = await prisma.category.create({
        data: {
          name,
          icon: icon || 'Briefcase',
          color: color || '#64748b',
          isSystem: false
        }
      });

      return res.status(201).json(category);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
