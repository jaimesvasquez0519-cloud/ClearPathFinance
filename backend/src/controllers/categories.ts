import { Response } from 'express';
import { prisma } from '../db';
import { seedCategories as autoSeedCategories } from '../../prisma/seed';

export const getCategories = async (req: any, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { isSystem: true },
          { userId: req.user.id }
        ]
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ],
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching categories' });
  }
};

export const createCategory = async (req: any, res: Response) => {
  try {
    const { name, type, icon, color, parentId } = req.body;

    const category = await prisma.category.create({
      data: {
        userId: req.user.id,
        name,
        type,
        icon,
        color,
        parentId,
        isSystem: false,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating category' });
  }
};

export const seedCategories = async (req: any, res: Response) => {
  try {
    const count = await autoSeedCategories(prisma);
    res.status(200).json({ message: `Successfully seeded ${count} categories.` });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({ error: 'Server error seeding categories' });
  }
};
