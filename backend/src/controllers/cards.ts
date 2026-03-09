import { Response } from 'express';
import { prisma } from '../db';

export const getCards = async (req: any, res: Response) => {
  try {
    const cards = await prisma.creditCard.findMany({
      where: { userId: req.user.id },
      orderBy: { bankName: 'asc' },
    });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching cards' });
  }
};

export const createCard = async (req: any, res: Response) => {
  try {
    const { 
      bankName, cardName, cardNetwork, creditLimit, 
      cutDay, paymentDueDay, interestRateMonthly, 
      minimumPaymentPct, color, lastFourDigits, currentBalance, closingDay, dueDay
    } = req.body;

    const finalCardName = cardName || `${bankName} ${cardNetwork}`;
    const finalCutDay = parseInt(cutDay ?? closingDay ?? 1);
    const finalDueDay = parseInt(paymentDueDay ?? dueDay ?? 1);

    const card = await prisma.creditCard.create({
      data: {
        userId: req.user.id,
        bankName,
        cardName: finalCardName,
        lastFourDigits: lastFourDigits?.toString().slice(-4),
        cardNetwork,
        creditLimit: parseFloat(creditLimit || 0),
        currentBalance: parseFloat(currentBalance || 0),
        cutDay: finalCutDay,
        paymentDueDay: finalDueDay,
        interestRateMonthly,
        minimumPaymentPct,
        color,
      },
    });
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating card' });
  }
};

export const updateCard = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      bankName, cardName, cardNetwork, creditLimit, 
      cutDay, paymentDueDay, interestRateMonthly, 
      minimumPaymentPct, color, lastFourDigits, currentBalance
    } = req.body;

    const finalCutDay = cutDay ? parseInt(cutDay) : undefined;
    const finalDueDay = paymentDueDay ? parseInt(paymentDueDay) : undefined;
    const finalLastFour = lastFourDigits ? lastFourDigits.toString().slice(-4) : undefined;

    const card = await prisma.creditCard.update({
      where: { id, userId: req.user.id },
      data: {
        bankName,
        cardName,
        cardNetwork,
        creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
        currentBalance: currentBalance !== undefined ? parseFloat(currentBalance) : undefined,
        cutDay: finalCutDay,
        paymentDueDay: finalDueDay,
        interestRateMonthly,
        minimumPaymentPct,
        color,
        lastFourDigits: finalLastFour,
      },
    });

    res.json(card);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating card' });
  }
};

export const deleteCard = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Optional: check if there are transactions tied to this card
    // For now we just delete the card. If there are FK constraints, we might want to set isActive=false instead.
    
    await prisma.creditCard.delete({
      where: { id, userId: req.user.id },
    });

    res.json({ success: true, message: 'Card deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting card' });
  }
};
