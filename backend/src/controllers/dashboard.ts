import { Response } from 'express';
import { prisma } from '../db';

export const getDashboardSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
    });
    const totalBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.currentBalance), 0);

    // Current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: { gte: startOfMonth },
      },
      include: { category: true },
    });

    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    monthlyTransactions.forEach((t: any) => {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        currentMonthIncome += amount;
      } else if (t.type === 'expense') {
        currentMonthExpense += amount;
        const catName: string = t.category?.name || 'Sin categoría';
        expenseByCategory[catName] = (expenseByCategory[catName] || 0) + amount;
      }
    });

    const netSavings = currentMonthIncome - currentMonthExpense;

    const expensesDistribution = Object.keys(expenseByCategory)
      .map((key) => ({ name: key, value: expenseByCategory[key] }))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // === HISTORICAL: last 3 months ===
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const historical = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: { gte: threeMonthsAgo },
        type: { in: ['income', 'expense'] },
      },
      select: { type: true, amount: true, transactionDate: true },
    });

    // Build a map: "2026-01" -> { month, ingresos, gastos }
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthMap: Record<string, { month: string; ingresos: number; gastos: number }> = {};

    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { month: monthNames[d.getMonth()] || '', ingresos: 0, gastos: 0 };
    }

    historical.forEach((t: any) => {
      const d = new Date(t.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        const amount = Number(t.amount);
        if (t.type === 'income') monthMap[key].ingresos += amount;
        else monthMap[key].gastos += amount;
      }
    });

    const monthlyChart = Object.values(monthMap);

    // === FINSCORE LOGIC ===
    let finScore = 50; // Base score
    
    // Factor 1: Savings (Higher savings = better score)
    if (netSavings > 0) {
      finScore += 20; // Bonus for saving
      // Calculate savings ratio
      const savingsRatio = currentMonthIncome > 0 ? (netSavings / currentMonthIncome) : 0;
      if (savingsRatio >= 0.2) finScore += 15; // +15 for saving 20%+
      else if (savingsRatio >= 0.1) finScore += 10;
    } else if (netSavings < 0) {
      finScore -= 20; // Penalty for deficit
    }

    // Factor 2: Activity (Bonus for having recorded transactions)
    if (monthlyTransactions.length > 5) finScore += 5;
    if (historical.length > 20) finScore += 10;

    // Cap the score between 0 and 100
    finScore = Math.max(0, Math.min(100, finScore));

    // === CREDIT CARDS ALERTS ===
    const creditCards = await prisma.creditCard.findMany({
      where: { userId },
      select: { id: true, bankName: true, cardName: true, paymentDueDay: true, currentBalance: true, cardNetwork: true }
    });

    // === ALL-TIME CATEGORY EXPENSES & EMERGENCY FUND ===
    const allTransactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true }
    });

    let emergencyFundTotal = 0;
    const allTimeCategoryExpenses: Record<string, number> = {};

    allTransactions.forEach((t: any) => {
      const amount = Number(t.amount);
      const catName = t.category?.name || 'Sin categoría';
      
      // We assume money moved to "Fondo de emergencia" either as expense or transfer counts towards the total saved in it
      if (catName.toLowerCase().includes('emergencia')) {
        emergencyFundTotal += amount;
      }

      if (t.type === 'expense') {
        allTimeCategoryExpenses[catName] = (allTimeCategoryExpenses[catName] || 0) + amount;
      }
    });

    const allTimeExpensesList = Object.keys(allTimeCategoryExpenses)
      .map(name => ({ name, value: allTimeCategoryExpenses[name] }))
      .sort((a,b) => b.value - a.value);

    res.json({
      totalBalance,
      currentMonthIncome,
      currentMonthExpense,
      netSavings,
      finScore: Math.round(finScore),
      expensesDistribution,
      monthlyChart,
      creditCards,
      emergencyFundTotal,
      allTimeExpensesList,
      recentTransactions: monthlyTransactions
        .sort((a: any, b: any) => new Date(b.createdAt || b.transactionDate).getTime() - new Date(a.createdAt || a.transactionDate).getTime())
        .slice(0, 5),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching dashboard' });
  }
};
