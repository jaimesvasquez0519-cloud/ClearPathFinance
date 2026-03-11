import { Response } from 'express';
import { prisma } from '../db';

export const getDashboardSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const globalSavingsGoal = user?.globalSavingsGoal || 0;

    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
    });
    // totalBalance explicitly only counts Accounts (liquid cash/bank), satisfying "excluded from main liquidity"
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

    let currentMonthCreditUsage = 0;
    let currentMonthSavings = 0;

    monthlyTransactions.forEach((t: any) => {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        currentMonthIncome += amount;
      } else if (t.type === 'expense' && !t.isDeferred) {
        currentMonthExpense += amount;
        const catName: string = t.category?.name || 'Sin categoría';
        expenseByCategory[catName] = (expenseByCategory[catName] || 0) + amount;
      } else if (t.type === 'expense' && t.isDeferred) {
        currentMonthCreditUsage += amount;
      } else if (t.type === 'savings') {
        currentMonthSavings += amount;
      }
    });

    const netSavings = currentMonthIncome - currentMonthExpense - currentMonthSavings;

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
      if (savingsRatio >= 0.2 && isFinite(savingsRatio)) finScore += 15; // +15 for saving 20%+
      else if (savingsRatio >= 0.1 && isFinite(savingsRatio)) finScore += 10;
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

    // === ALL-TIME CATEGORY EXPENSES ===
    const allTransactions = await prisma.transaction.findMany({
      where: { userId, type: 'expense' },
      include: { category: true }
    });

    const allTimeCategoryExpenses: Record<string, number> = {};

    allTransactions.forEach((t: any) => {
      const amount = Number(t.amount);
      const catName = t.category?.name || 'Sin categoría';
      
      allTimeCategoryExpenses[catName] = (allTimeCategoryExpenses[catName] || 0) + amount;
    });

    const allTimeExpensesList = Object.keys(allTimeCategoryExpenses)
      .map(name => ({ name, value: allTimeCategoryExpenses[name] }))
      .sort((a,b) => b.value - a.value);

    // === SAVINGS & EMERGENCY POCKETS (PHASE 6 & 7) ===
    const goals = await prisma.goal.findMany({
      where: { userId }
    });
    
    let emergencyFundTotal = 0;
    let emergencyFundTarget = 0;
    let savingsTotal = 0;
    
    goals.forEach((g: any) => {
      if (g.type === 'emergency') {
        emergencyFundTotal += Number(g.currentAmount || 0);
        emergencyFundTarget += Number(g.targetAmount || 0);
      } else {
        savingsTotal += Number(g.currentAmount || 0);
      }
    });

    // === KPI: BURN RATE & RUNWAY ===
    const totalHistoricalExpenses = historical
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const daysSinceThreeMonthsAgo = Math.max(1, Math.floor((now.getTime() - threeMonthsAgo.getTime()) / (1000 * 60 * 60 * 24)));
    const burnRate = totalHistoricalExpenses / daysSinceThreeMonthsAgo;
    const runwayDays = (burnRate > 0 && isFinite(burnRate)) ? Math.round(totalBalance / burnRate) : 999;

    // === KPI: TASA DE ESFUERZO (EFFORT RATE) & FINANCIAL INSIGHT ===
    let currentMonthDebtPayments = 0;
    monthlyTransactions.forEach((t: any) => {
      const amount = Number(t.amount);
      if (t.type === 'expense' && !t.isDeferred) {
        const catName: string = (t.category?.name || '').toLowerCase();
        if (catName.includes('hipoteca') || catName.includes('tarjeta') || catName.includes('crédito') || catName.includes('prestamo') || catName.includes('préstamo') || catName.includes('deuda') || t.cardId) {
          currentMonthDebtPayments += amount;
        }
      }
    });
    const effortRate = currentMonthIncome > 0 ? (currentMonthDebtPayments / currentMonthIncome) * 100 : 0;
    
    let financialInsight = "";
    if (effortRate < 20) {
      financialInsight = "Tu nivel de endeudamiento es saludable. ¡Excelente manejo!";
    } else if (effortRate <= 35) {
      financialInsight = `Tu nivel de endeudamiento es del ${Math.round(effortRate)}%. Considera no diferir compras a más de 1 cuota este mes.`;
    } else {
      financialInsight = `¡Atención! Tu capacidad de pago está comprometida (${Math.round(effortRate)}% de tus ingresos). Evita nuevas deudas.`;
    }

    // === SMART PRO: BALANCE PREDICTION (Linear Regression) ===
    // Find transactions in the last 30 days to build a running balance
    // We will approximate linear regression y = mx + b where x is day (0 to 30)
    // For simplicity, we use the historical transactions to find daily net flow
    // Calculate b = currentBalance
    // Calculate m = average daily net flow over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTx = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: thirtyDaysAgo } }
    });
    const netFlow30 = recentTx.reduce((acc: number, t: any) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    const dailyTrend = netFlow30 / 30;
    
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - currentDay;
    const predictedEndOfWeekBalance = isFinite(dailyTrend) ? totalBalance + (dailyTrend * 7) : totalBalance;
    const predictedEndOfMonthBalance = isFinite(dailyTrend) ? totalBalance + (dailyTrend * daysLeft) : totalBalance;

    // === SMART PRO: EXPENSE OPTIMIZATION INSIGHT ===
    let optimizationInsight = "Tus gastos están bajo control este mes. ¡Sigue así!";
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const lastMonthTx = await prisma.transaction.findMany({
      where: { userId, type: 'expense', transactionDate: { gte: lastMonthStart, lte: lastMonthEnd } },
      include: { category: true }
    });
    
    const lastMonthCategoryTotals: Record<string, number> = {};
    lastMonthTx.forEach((t: any) => {
      const cat = t.category?.name || 'Otros';
      lastMonthCategoryTotals[cat] = (lastMonthCategoryTotals[cat] || 0) + Number(t.amount);
    });

    let highestExcessCat = '';
    let highestExcessAmount = 0;

    Object.keys(expenseByCategory).forEach(cat => {
      const currentM = expenseByCategory[cat];
      const lastM = lastMonthCategoryTotals[cat] || 0;
      if (lastM > 0 && currentM > lastM * 1.2) { // 20% more
        const excess = currentM - lastM;
        if (excess > highestExcessAmount) {
          highestExcessAmount = excess;
          highestExcessCat = cat;
        }
      }
    });

    if (highestExcessCat && highestExcessAmount > 0) {
      optimizationInsight = `Has gastado $${Math.round(highestExcessAmount).toLocaleString('es-CO')} más en ${highestExcessCat} que el mes pasado promedio. Si reduces esto, podrías alcanzar tus metas de ahorro más rápido.`;
    }
    
    res.json({
      totalBalance,
      currentMonthIncome,
      currentMonthExpense,
      netSavings,
      finScore: Math.round(finScore),
      burnRate,
      runwayDays,
      effortRate,
      financialInsight,
      currentMonthCreditUsage,
      currentMonthSavings,
      predictedEndOfWeekBalance,
      predictedEndOfMonthBalance,
      optimizationInsight,
      expensesDistribution,
      monthlyChart,
      creditCards,
      emergencyFundTotal,
      emergencyFundTarget,
      savingsTotal,
      globalSavingsGoal,
      allTimeExpensesList,
      recentTransactions: monthlyTransactions
        .sort((a: any, b: any) => new Date(b.createdAt || b.transactionDate).getTime() - new Date(a.createdAt || a.transactionDate).getTime())
        .slice(0, 5),
    });
  } catch (error) {
    console.error('[DASHBOARD ERROR]', error);
    res.status(500).json({ error: 'Server error fetching dashboard' });
  }
};

export const simulateScenario = async (req: any, res: Response) => {
  try {
    const { amount, months, name } = req.body;
    const userId = req.user.id;
    
    if (!amount || !months || months <= 0) {
      return res.status(400).json({ error: 'Valid amount and months required' });
    }

    const monthlyImpact = Number(amount) / Number(months);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTransactions = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: startOfMonth } },
      include: { category: true }
    });

    let currentIncome = 0;
    let currentExpense = 0;
    let currentDebtPayments = 0;

    monthlyTransactions.forEach((t: any) => {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        currentIncome += amt;
      } else if (t.type === 'expense') {
        currentExpense += amt;
        const catName: string = (t.category?.name || '').toLowerCase();
        if (catName.includes('hipoteca') || catName.includes('tarjeta') || catName.includes('crédito') || catName.includes('prestamo') || catName.includes('préstamo') || catName.includes('deuda') || t.cardId) {
          currentDebtPayments += amt;
        }
      }
    });

    const newMonthlyExpense = currentExpense + monthlyImpact;
    const newSavings = currentIncome - newMonthlyExpense;
    const newDebtPayments = currentDebtPayments + monthlyImpact;
    const newEffortRate = currentIncome > 0 ? (newDebtPayments / currentIncome) * 100 : 0;
    const currentEffortRate = currentIncome > 0 ? (currentDebtPayments / currentIncome) * 100 : 0;

    res.json({
      scenarioName: name || 'Simulación',
      monthlyImpact,
      projectedExpense: newMonthlyExpense,
      projectedSavings: newSavings,
      projectedEffortRate: newEffortRate,
      currentEffortRate,
      isDangerous: newEffortRate > 40 || newSavings < 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error running simulation' });
  }
};

