import { Response } from 'express';
import { prisma } from '../db';
import { addMonths } from 'date-fns';

export const getRecurringTransactions = async (req: any, res: Response) => {
  try {
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: req.user.id },
      include: {
        category: true,
        account: true,
        creditCard: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recurring);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching recurring transactions' });
  }
};

export const createRecurringTransaction = async (req: any, res: Response) => {
  try {
    const { 
      type, amount, categoryId, accountId, cardId, description, frequency, dayOfMonth 
    } = req.body;

    // Defensive: normalize empty strings to null and provide defaults
    const safeAccountId = accountId && accountId !== '' ? accountId : null;
    const safeCardId = cardId && cardId !== '' ? cardId : null;
    const safeCategoryId = categoryId && categoryId !== '' ? categoryId : null;
    const safeFrequency = frequency || 'monthly';
    const safeDayOfMonth = Number(dayOfMonth) || new Date().getDate();

    // Calculate next processing date based on dayOfMonth
    const now = new Date();
    let nextDate = new Date(now.getFullYear(), now.getMonth(), safeDayOfMonth);

    // If the day has already passed this month, the first processing is next month
    if (nextDate <= now) {
       nextDate = addMonths(nextDate, 1);
       const maxDaysInNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
       nextDate.setDate(Math.min(safeDayOfMonth, maxDaysInNextMonth));
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: req.user.id,
        type, 
        amount: Number(amount), 
        currency: 'COP',
        categoryId: safeCategoryId,
        accountId: safeAccountId,
        cardId: safeCardId,
        description, 
        frequency: safeFrequency, 
        dayOfMonth: safeDayOfMonth,
        nextProcessing: nextDate,
        isActive: true,
      },
    });
    res.status(201).json(recurring);
  } catch (error) {
    console.error('❌ Error creating recurring transaction:', error);
    res.status(500).json({ error: 'Server error creating recurring transaction' });
  }
};

export const updateRecurringTransaction = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, dayOfMonth, isActive } = req.body;

    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    let nextProcessing = existing.nextProcessing;

    if (dayOfMonth && dayOfMonth !== existing.dayOfMonth) {
       const now = new Date();
       let nextDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
       if (nextDate <= now) {
          nextDate = addMonths(nextDate, 1);
       }
       const maxDaysInNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
       nextDate.setDate(Math.min(dayOfMonth, maxDaysInNextMonth));
       nextProcessing = nextDate;
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        amount: amount !== undefined ? Number(amount) : undefined,
        dayOfMonth: dayOfMonth !== undefined ? Number(dayOfMonth) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        nextProcessing
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating recurring transaction' });
  }
};

export const deleteRecurringTransaction = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    await prisma.recurringTransaction.delete({
      where: { id },
    });

    res.json({ message: 'Recurring transaction deleted completely' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting recurring transaction' });
  }
};
