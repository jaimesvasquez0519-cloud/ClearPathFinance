import { Response } from 'express';
import { prisma } from '../db';

export const getTransactions = async (req: any, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { transactionDate: 'desc' },
      include: {
        category: true,
        account: true,
        creditCard: true,
      },
      take: 50,
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching transactions' });
  }
};

export const createTransaction = async (req: any, res: Response) => {
  try {
    const { 
      type, amount, categoryId, accountId, cardId, 
      description, transactionDate 
    } = req.body;

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create the transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: req.user.id,
          type,
          amount,
          currency: 'COP', // simplify for MVP
          categoryId: categoryId || null,
          accountId: accountId || null,
          cardId: cardId || null,
          description,
          transactionDate: new Date(transactionDate),
        },
        include: { category: true, account: true, creditCard: true }
      });

      // 2. Update Account or Card Balance
      if (accountId) {
        if (type === 'income') {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { increment: amount } }
          });
        } else if (type === 'expense') {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: amount } }
          });
        }
      } else if (cardId) {
        if (type === 'expense') {
          // Expense on a credit card increases the balance (debt)
          await tx.creditCard.update({
            where: { id: cardId },
            data: { currentBalance: { increment: amount } }
          });
        } else if (type === 'income') {
          // Income on a credit card decreases the balance (payment)
          await tx.creditCard.update({
            where: { id: cardId },
            data: { currentBalance: { decrement: amount } }
          });
        }
      }

      return transaction;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating transaction' });
  }
};

export const deleteTransaction = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Find the transaction to get amount, type, accountId, cardId
      const transaction = await tx.transaction.findUnique({
        where: { id, userId: req.user.id },
      });

      if (!transaction) throw new Error('Transaction not found');

      // 2. Revert the balance
      if (transaction.accountId) {
        if (transaction.type === 'income') {
          await tx.account.update({
            where: { id: transaction.accountId },
            data: { currentBalance: { decrement: transaction.amount } }
          });
        } else if (transaction.type === 'expense') {
          await tx.account.update({
            where: { id: transaction.accountId },
            data: { currentBalance: { increment: transaction.amount } }
          });
        }
      } else if (transaction.cardId) {
        if (transaction.type === 'expense') {
          // Reverting an expense on a card decreases the balance
          await tx.creditCard.update({
            where: { id: transaction.cardId },
            data: { currentBalance: { decrement: transaction.amount } }
          });
        } else if (transaction.type === 'income') {
          // Reverting an income (payment) on a card increases the balance
          await tx.creditCard.update({
            where: { id: transaction.cardId },
            data: { currentBalance: { increment: transaction.amount } }
          });
        }
      }

      // 3. Delete the transaction
      await tx.transaction.delete({
        where: { id },
      });

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting transaction' });
  }
};

export const payCreditCard = async (req: any, res: Response) => {
  try {
    const { accountId, cardId, amount, description } = req.body;
    const userId = req.user.id;

    if (!accountId || !cardId || !amount) {
      return res.status(400).json({ error: 'Account, Card, and amount are required' });
    }

    const numericAmount = Number(amount);

    if (numericAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    // Execute payment atomicity via Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct money from the source account
      const originAccount = await tx.account.update({
        where: { id: accountId, userId },
        data: { currentBalance: { decrement: numericAmount } }
      });

      // 2. Reduce the debt from the credit card
      const targetCard = await tx.creditCard.update({
        where: { id: cardId, userId },
        data: { currentBalance: { decrement: numericAmount } }
      });

      // 3. Create a transaction log (as transfer type so it doesn't inflate expenses)
      const newTransaction = await tx.transaction.create({
        data: {
          userId,
          type: 'transfer', // Treat as transfer internally
          amount: numericAmount,
          currency: originAccount.currency,
          accountId,
          cardId,
          description: description || `Pago a tarjeta ${targetCard.cardName || targetCard.bankName}`,
          transactionDate: new Date()
        }
      });

      return { transaction: newTransaction, newAccountBalance: originAccount.currentBalance, newCardDebt: targetCard.currentBalance };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error processing credit card payment' });
  }
};

