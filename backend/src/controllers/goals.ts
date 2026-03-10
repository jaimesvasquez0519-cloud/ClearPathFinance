import { Request, Response } from 'express';
import { prisma } from '../db';

export const getGoals = async (req: any, res: Response) => {
  try {
    const goalsList = await prisma.goal.findMany({
      where: { userId: req.user.id }
    });
    res.json(goalsList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching goals' });
  }
};

export const createGoal = async (req: any, res: Response) => {
  try {
    const { name, targetAmount, type, deadline, color, icon } = req.body;
    const goal = await prisma.goal.create({
      data: {
        userId: req.user.id,
        name,
        targetAmount: Number(targetAmount),
        type: type || 'pocket', // pocket or emergency
        currentAmount: 0,
        deadline: deadline ? new Date(deadline) : null,
        color,
        icon,
      },
    });
    res.status(201).json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating goal' });
  }
};

export const updateGoal = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, type, currentAmount, deadline, color, icon } = req.body;
    
    // Verify ownership
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        targetAmount: targetAmount !== undefined ? Number(targetAmount) : undefined,
        currentAmount: currentAmount !== undefined ? Number(currentAmount) : undefined,
        type: type !== undefined ? type : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        color: color !== undefined ? color : undefined,
        icon: icon !== undefined ? icon : undefined,
      },
    });
    res.json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating goal' });
  }
};

export const deleteGoal = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await prisma.goal.delete({ where: { id } });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting goal' });
  }
};
