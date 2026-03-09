import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getBudgets = async (req: any, res: Response) => {
  try {
    const { period, month, year } = req.query;
    
    // Default to current month if no specific dates provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month as string) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const budgets = await prisma.budget.findMany({
      where: { userId: req.user.id },
      include: { category: true },
    });

    // Dynamically calculate spent amounts based on transactions for this period
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        if (!budget.categoryId) {
            return { ...budget, spentAmount: 0 };
        }

        const transactions = await prisma.transaction.aggregate({
          where: {
            userId: req.user.id,
            categoryId: budget.categoryId,
            type: 'expense',
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const spentAmount = transactions._sum.amount || 0;
        
        return {
          ...budget,
          spentAmount,
        };
      })
    );

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching budgets' });
  }
};

export const createBudget = async (req: any, res: Response) => {
  try {
    const { categoryId, period, amountLimit } = req.body;

    const newBudget = await prisma.budget.create({
      data: {
        userId: req.user.id,
        categoryId,
        period: period || 'monthly',
        amountLimit: parseFloat(amountLimit),
      },
      include: { category: true }
    });

    res.status(201).json({ ...newBudget, spentAmount: 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating budget' });
  }
};

export const updateBudget = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amountLimit, period } = req.body;

    const budget = await prisma.budget.update({
      where: { id, userId: req.user.id },
      data: {
        amountLimit: amountLimit ? parseFloat(amountLimit) : undefined,
        period,
      },
    });

    res.json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating budget' });
  }
};

export const deleteBudget = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.budget.delete({
      where: { id, userId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting budget' });
  }
};
