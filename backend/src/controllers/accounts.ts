import { Response } from 'express';
import { prisma } from '../db';

export const getAccounts = async (req: any, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { accountName: 'asc' },
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching accounts' });
  }
};

export const createAccount = async (req: any, res: Response) => {
  try {
    const { accountName, accountType, type, bankName, initialBalance, currentBalance, currency, color, accountNumber } = req.body;
    
    const finalType = accountType || type || 'checking';
    const finalInitial = parseFloat(initialBalance ?? currentBalance ?? 0);
    const finalName = accountName || `${bankName} ${finalType}`;

    const account = await prisma.account.create({
      data: {
        userId: req.user.id,
        accountName: finalName,
        accountNumber: accountNumber || null,
        accountType: finalType,
        bankName,
        initialBalance: finalInitial,
        currentBalance: finalInitial,
        currency: currency || 'COP',
        color,
      },
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating account' });
  }
};

export const updateAccount = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { accountName, accountType, bankName, color, currentBalance, currency, accountNumber } = req.body;
    
    // Verify ownership
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const updateData: any = {};
    if (accountName !== undefined) updateData.accountName = accountName;
    if (accountType !== undefined) updateData.accountType = accountType;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (color !== undefined) updateData.color = color;
    if (currency !== undefined) updateData.currency = currency;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (currentBalance !== undefined) updateData.currentBalance = parseFloat(currentBalance);

    // Auto-generate accountName from bankName + accountType if not explicitly set
    if (!updateData.accountName && (updateData.bankName || updateData.accountType)) {
      updateData.accountName = `${updateData.bankName ?? existing.bankName} ${updateData.accountType ?? existing.accountType}`;
    }

    const account = await prisma.account.update({
      where: { id },
      data: updateData,
    });
    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating account' });
  }
};

export const deleteAccount = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      
      const existing = await prisma.account.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: 'Account not found' });
      }
  
      await prisma.account.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'Account disabled' });
    } catch (error) {
      res.status(500).json({ error: 'Server error disabling account' });
    }
  };
