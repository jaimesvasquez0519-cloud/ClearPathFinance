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

const categorizeByNLP = async (description: string, type: string) => {
  if (!description) return null;
  const lowerDesc = description.toLowerCase();
  
  const keywords: Record<string, string> = {
    'uber': 'Uber / Taxi', 'taxi': 'Uber / Taxi', 'didi': 'Uber / Taxi', 'cabify': 'Uber / Taxi',
    'restaurante': 'Restaurantes / Comer fuera', 'mcdonalds': 'Restaurantes / Comer fuera', 'burger king': 'Restaurantes / Comer fuera', 'kfc': 'Restaurantes / Comer fuera',
    'starbucks': 'Cafés / Snacks', 'cafe': 'Cafés / Snacks', 'café': 'Cafés / Snacks', 'juan valdez': 'Cafés / Snacks',
    'netflix': 'Suscripciones', 'spotify': 'Suscripciones', 'amazon prime': 'Suscripciones', 'hbo': 'Suscripciones',
    'cine': 'Cine / Salidas / Ocio', 'cinecolombia': 'Cine / Salidas / Ocio', 'cinemark': 'Cine / Salidas / Ocio',
    'smart fit': 'Gimnasio / Deportes', 'gimnasio': 'Gimnasio / Deportes', 'bodytech': 'Gimnasio / Deportes',
    'farmatodo': 'Farmacia / Medicamentos', 'cruz verde': 'Farmacia / Medicamentos', 'drogueria': 'Farmacia / Medicamentos', 'farmacia': 'Farmacia / Medicamentos',
    'exito': 'Supermercado', 'carulla': 'Supermercado', 'jumbo': 'Supermercado', 'olimpica': 'Supermercado', 'd1': 'Supermercado', 'ara': 'Supermercado',
    'peluqueria': 'Cuidado personal / Peluquería', 'barberia': 'Cuidado personal / Peluquería',
    'gasolina': 'Combustible / Gasolina', 'terpel': 'Combustible / Gasolina', 'esso': 'Combustible / Gasolina', 'primax': 'Combustible / Gasolina',
  };

  for (const [key, categoryName] of Object.entries(keywords)) {
    if (lowerDesc.includes(key)) {
      const category = await prisma.category.findFirst({ where: { name: categoryName, type } });
      return category ? category.id : null;
    }
  }
  return null;
};

export const createTransaction = async (req: any, res: Response) => {
  try {
    const { 
      type, amount, categoryId, accountId, cardId, 
      description, transactionDate 
    } = req.body;

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: any) => {
      // 0. Auto-categorize by NLP if missing
      let finalCategoryId = categoryId;
      if (!finalCategoryId && description) {
        finalCategoryId = await categorizeByNLP(description, type);
      }

      // 1. Calculate Amortization Schedule if needed
      let amortizationSchedule = null;
      let isDeferred = false;
      const parsedAmount = Number(amount);
      const installmentsTotalNum = Number(req.body.installmentsTotal || 1);

      if (cardId && type === 'expense') {
        isDeferred = true; // Credit card expenses are liabilities, not instant cash drops

        // === CREDIT LIMIT VALIDATION ===
        const card = await tx.creditCard.findUnique({ where: { id: cardId, userId: req.user.id } });
        if (!card) throw new Error('Credit card not found');
        
        const newBalance = Number(card.currentBalance) + parsedAmount;
        const limit = Number(card.creditLimit);
        
        if (limit > 0 && newBalance > limit) {
          const available = limit - Number(card.currentBalance);
          throw Object.assign(new Error(`Cupo insuficiente. Disponible: $${available.toLocaleString('es-CO')}. Esta tarjeta sólo tiene $${available.toLocaleString('es-CO')} disponibles de $${limit.toLocaleString('es-CO')} de límite.`), { code: 'CREDIT_LIMIT_EXCEEDED', available, limit, currentBalance: card.currentBalance });
        }
        // ===============================
        
        if (installmentsTotalNum > 1 && req.body.installmentInterestRate !== undefined) {
           const ratePct = Number(req.body.installmentInterestRate);
           const r = ratePct / 100;
           let monthlyPayment = parsedAmount / installmentsTotalNum;
           
           if (r > 0) {
             monthlyPayment = (parsedAmount * r * Math.pow(1 + r, installmentsTotalNum)) / (Math.pow(1 + r, installmentsTotalNum) - 1);
           }
           
           const schedule = [];
           let remainingPrincipal = parsedAmount;
           
           for (let i = 1; i <= installmentsTotalNum; i++) {
             const interest = remainingPrincipal * r;
             const principal = monthlyPayment - interest;
             remainingPrincipal -= principal;
             
             schedule.push({
               installment: i,
               payment: monthlyPayment,
               capital: principal,
               interest: interest,
               balance: Math.max(0, remainingPrincipal) // Avoid negative precision errors
             });
           }
           
           amortizationSchedule = schedule;
        }
      }

      let finalGoalId = req.body.goalId;
      if (finalCategoryId) {
         const cat = await tx.category.findUnique({ where: { id: finalCategoryId }});
         if (cat?.name?.toLowerCase().includes('emergencia')) {
             const emergeGoal = await tx.goal.findFirst({ where: { userId: req.user.id, type: 'emergency' } });
             if (emergeGoal) finalGoalId = emergeGoal.id;
         }
      }

      // 2. Create the transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: req.user.id,
          type,
          amount: parsedAmount,
          currency: 'COP', 
          categoryId: finalCategoryId || null,
          accountId: accountId || null,
          cardId: cardId || null,
          goalId: finalGoalId || null,
          description,
          transactionDate: new Date(transactionDate),
          isDeferred,
          installmentsTotal: installmentsTotalNum,
          installmentInterestRate: req.body.installmentInterestRate ? Number(req.body.installmentInterestRate) : null,
          installmentCurrent: installmentsTotalNum > 1 ? 1 : 1,
          amortizationSchedule: amortizationSchedule || undefined
        },
        include: { category: true, account: true, creditCard: true }
      });

      // 3. Update Account, Card or Goal Balance
      if (type === 'savings') {
        // Savings logic: deduct from account (real cash moves to "savings pool")
        // and optionally allocate to a specific pocket (goal)
        if (accountId) {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: parsedAmount } }
          });
        }
        if (finalGoalId) {
          await tx.goal.update({
            where: { id: finalGoalId },
            data: { currentAmount: { increment: parsedAmount } }
          });
        }
      } else if (accountId) {
        if (type === 'income') {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { increment: parsedAmount } }
          });
        } else if (type === 'expense') {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: parsedAmount } }
          });
        }
      } else if (cardId) {
        if (type === 'expense') {
          // Expense on a credit card increases the balance (debt)
          await tx.creditCard.update({
            where: { id: cardId },
            data: { currentBalance: { increment: parsedAmount } }
          });
        } else if (type === 'income') {
          // Income on a credit card decreases the balance (payment)
          await tx.creditCard.update({
            where: { id: cardId },
            data: { currentBalance: { decrement: parsedAmount } }
          });
        }
      }

      // 4. Outlier / Anomaly Detection
      if (type === 'expense' && finalCategoryId) {
        const pastExpenses = await tx.transaction.findMany({
          where: { userId: req.user.id, type: 'expense', categoryId: finalCategoryId }
        });
        
        if (pastExpenses.length > 3) {
          const sum = pastExpenses.reduce((acc: number, val: any) => acc + Number(val.amount), 0);
          const avg = sum / pastExpenses.length;
          
          if (amount > avg * 1.2) {
             const updatedDescription = `[ALERTA: Gasto inusual] ${transaction.description || ''}`.trim();
             await tx.transaction.update({
               where: { id: transaction.id },
               data: { description: updatedDescription }
             });
             transaction.description = updatedDescription;
             // Here we could also trigger a push notification or email
          }
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
      if (transaction.type === 'savings') {
         if (transaction.accountId) {
           await tx.account.update({
             where: { id: transaction.accountId },
             data: { currentBalance: { increment: transaction.amount } }
           });
         }
         if (transaction.goalId) {
           await tx.goal.update({
             where: { id: transaction.goalId },
             data: { currentAmount: { decrement: transaction.amount } }
           });
         }
      } else if (transaction.accountId) {
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
          // Reverting an expense on a card decreases the liability
          await tx.creditCard.update({
            where: { id: transaction.cardId },
            data: { currentBalance: { decrement: transaction.amount } }
          });
        } else if (transaction.type === 'income') {
          // Reverting an income (payment) on a card increases the liability back
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

export const extraordinaryPayment = async (req: any, res: Response) => {
  try {
    const { transactionId, extraAmount, preference } = req.body;
    const userId = req.user.id;

    if (!transactionId || !extraAmount || extraAmount <= 0 || !preference) {
      return res.status(400).json({ error: 'Valid transactionId, extraAmount, and preference required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId, userId }
      });

      if (!transaction || !transaction.isDeferred || !transaction.amortizationSchedule) {
        throw new Error('Transaction invalid for extraordinary payment');
      }

      const schedule: any = transaction.amortizationSchedule;
      const currentInstallment = transaction.installmentCurrent;
      
      // We will look for the outstanding principal balance right before this payment
      // Simply: grab the balance of the previous installment, or initial amount if it's the 1st
      let remainingPrincipal = Number(transaction.amount);
      if (currentInstallment > 1 && currentInstallment - 2 < schedule.length) {
         remainingPrincipal = Number(schedule[currentInstallment - 2].balance);
      }
      
      // Apply extra payment directly to principal
      remainingPrincipal -= Number(extraAmount);

      if (remainingPrincipal <= 0) {
        // Debt fully paid
        await tx.transaction.update({
           where: { id: transactionId },
           data: { 
             installmentsTotal: currentInstallment, 
             amortizationSchedule: schedule.slice(0, currentInstallment - 1) 
           }
        });
        return { message: 'Debt fully paid' };
      }

      // Recalculate based on preference
      const ratePct = Number(transaction.installmentInterestRate || 0);
      const r = ratePct / 100;
      let newSchedule = schedule.slice(0, currentInstallment - 1);
      
      if (preference === 'reduce_payment') {
        const remainingInstallments = transaction.installmentsTotal - currentInstallment + 1;
        let pmt = remainingPrincipal / remainingInstallments;
        if (r > 0) {
          pmt = (remainingPrincipal * r * Math.pow(1 + r, remainingInstallments)) / (Math.pow(1 + r, remainingInstallments) - 1);
        }
        
        let bal = remainingPrincipal;
        for (let i = currentInstallment; i <= transaction.installmentsTotal; i++) {
          const interest = bal * r;
          const cap = pmt - interest;
          bal -= cap;
          newSchedule.push({
            installment: i,
            payment: pmt,
            capital: cap,
            interest,
            balance: Math.max(0, bal)
          });
        }
      } else if (preference === 'reduce_installments') {
         // Keep the same payment amount, decrease number of installments
         const pmt = Number(schedule[0].payment);
         let bal = remainingPrincipal;
         let i = currentInstallment;
         
         while (bal > 0) {
           const interest = bal * r;
           let cap = pmt - interest;
           
           if (cap >= bal) {
             cap = bal;
             bal = 0;
           } else {
             bal -= cap;
           }
           
           newSchedule.push({
             installment: i,
             payment: cap + interest,
             capital: cap,
             interest,
             balance: Math.max(0, bal)
           });
           i++;
         }
      }

      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          installmentsTotal: newSchedule.length,
          amortizationSchedule: newSchedule
        }
      });
      
      return updatedTransaction;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error processing extraordinary payment' });
  }
};

