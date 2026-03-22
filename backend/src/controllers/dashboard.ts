import { Response } from 'express';
import { prisma } from '../db';

export const getDashboardSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const globalSavingsGoal = user?.globalSavingsGoal || 0;

    const accounts = await prisma.account.findMany({ where: { userId, isActive: true }});
    const totalBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.currentBalance), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTransactions = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: startOfMonth } },
      include: { category: true },
    });

    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    let currentMonthCreditUsage = 0;
    let currentMonthSavings = 0;
    let currentMonthDebtPayments = 0;

    monthlyTransactions.forEach((t: any) => {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        currentMonthIncome += amount;
      } else if (t.type === 'expense' && !t.isDeferred) {
        currentMonthExpense += amount;
        const catName: string = t.category?.name || 'Sin categoría';
        expenseByCategory[catName] = (expenseByCategory[catName] || 0) + amount;
        
        // Effort rate component
        const lowerCat: string = catName.toLowerCase();
        if (lowerCat.includes('hipoteca') || lowerCat.includes('tarjeta') || lowerCat.includes('crédito') || lowerCat.includes('prestamo') || lowerCat.includes('préstamo') || lowerCat.includes('deuda') || t.cardId) {
          currentMonthDebtPayments += amount;
        }
      } else if (t.type === 'expense' && t.isDeferred) {
        currentMonthCreditUsage += amount;
      } else if (t.type === 'savings') {
        currentMonthSavings += amount;
      }
    });

    const netSavings = currentMonthIncome - currentMonthExpense - currentMonthSavings;
    const effortRate = currentMonthIncome > 0 ? (currentMonthDebtPayments / currentMonthIncome) * 100 : 0;

    // === MÓDULO INTELIGENCIA FINANCIERA (SCORE EXACTO) ===
    let finScore = Math.max(0, 100 - effortRate);
    let financialInsight = "";
    
    if (effortRate < 40) {
      financialInsight = "Vas por excelente camino. Tienes liquidez para ahorrar y tus deudas están controladas.";
    } else if (effortRate <= 80) {
      financialInsight = "Estás llegando a tu límite de capacidad de pago. Modera tus gastos a cuotas.";
    } else {
      financialInsight = `¡Atención! Has excedido el 80% de tus ingresos en deudas. Evita cualquier nueva deuda inmediatamente.`;
    }

    const expensesDistribution = Object.keys(expenseByCategory).map((name) => ({ name, value: expenseByCategory[name] })).sort((a, b) => b.value - a.value);

    // === HISTORICAL: last 3 months ===
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const historical = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: threeMonthsAgo }, type: { in: ['income', 'expense'] } },
      select: { type: true, amount: true, transactionDate: true, category: { select: { name: true } } },
    });
    
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
        if (t.type === 'income') monthMap[key].ingresos += Number(t.amount);
        else monthMap[key].gastos += Number(t.amount);
      }
    });
    const monthlyChart = Object.values(monthMap);

    // === CREDIT CARDS ALERTS & INSTALLMENTS ===
    const creditCardsRaw = await prisma.creditCard.findMany({
      where: { userId },
      select: { id: true, bankName: true, cardName: true, paymentDueDay: true, currentBalance: true, cardNetwork: true, creditLimit: true, lastFourDigits: true }
    });

    let totalCreditLimit = 0;
    let totalCreditUsed = 0;

    const creditCards = await Promise.all(creditCardsRaw.map(async (card: any) => {
      totalCreditLimit += Number(card.creditLimit || 0);
      totalCreditUsed += Number(card.currentBalance || 0);

      const deferredTxs = await prisma.transaction.findMany({ where: { cardId: card.id, isDeferred: true } });
      
      let pendingCapital = 0;
      let pendingInterest = 0;
      let activeInstallments: any[] = [];
      
      deferredTxs.forEach((tx: any) => {
        if (tx.amortizationSchedule) {
          try {
            const schedule = typeof tx.amortizationSchedule === 'string' ? JSON.parse(tx.amortizationSchedule) : tx.amortizationSchedule;
            
            const currentInst = schedule.find((inst: any) => inst.status === 'pending') || schedule[0];
            if (currentInst) {
              const cap = Number(currentInst.capital || currentInst.principal || 0);
              const int = Number(currentInst.interest || 0);
              const pmt = Number(currentInst.payment || cap + int);
              
              activeInstallments.push({
                 id: tx.id,
                 description: tx.description || 'Compra diferida',
                 date: tx.transactionDate,
                 installmentCurrent: currentInst.installment,
                 installmentsTotal: tx.installmentsTotal,
                 capital: cap,
                 interest: int,
                 payment: pmt,
                 originalAmount: Number(tx.amount)
              });
            }

            schedule.forEach((inst: any) => {
               if (inst.status === 'pending') {
                 pendingCapital += Number(inst.principal || inst.capital || 0);
                 pendingInterest += Number(inst.interest || 0);
               }
            });
          } catch(e) {}
        }
      });
      activeInstallments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const thisMonthSpent = await prisma.transaction.aggregate({
        where: { cardId: card.id, type: 'expense', transactionDate: { gte: startOfMonth } },
        _sum: { amount: true }
      });
      
      // Payoff Advice
      let payoffAdvice = "";
      if (card.currentBalance > 0 && currentMonthIncome > 0) {
         if (effortRate < 40) {
            const extra = Math.round(currentMonthIncome * 0.1);
            payoffAdvice = `Buena liquidez mensual. Si logras aportar $${extra.toLocaleString('es-CO')} extra a capital en ${card.bankName}, terminarás de pagar deuda meses antes ahorrando dinero futuro en intereses brutos.`;
         } else if (effortRate <= 80) {
            payoffAdvice = `Llegaste a la zona de precaución. Mantén tus cuotas estables y evalúa recortar compras no vitales en ${card.bankName}.`;
         } else {
            payoffAdvice = `¡Advertencia! No uses esta tarjeta (${card.bankName}) para nuevos consumos. Prioriza pagar al menos el mínimo.`;
         }
      } else if (card.currentBalance === 0) {
         payoffAdvice = `Todo en cero. Excelente manejo de tu financiamiento.`;
      }

      return {
        ...card,
        pendingCapital,
        pendingInterest,
        activeInstallments,
        payoffAdvice,
        currentMonthSpent: Number(thisMonthSpent._sum?.amount || 0)
      };
    }));

    const creditUtilizationRate = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

    // === ALL-TIME CATEGORY EXPENSES & GOALS ===
    const allTransactions = await prisma.transaction.findMany({ where: { userId, type: 'expense' }, include: { category: true } });
    const allTimeCategoryExpenses: Record<string, number> = {};
    allTransactions.forEach((t: any) => {
      const catName = t.category?.name || 'Sin categoría';
      allTimeCategoryExpenses[catName] = (allTimeCategoryExpenses[catName] || 0) + Number(t.amount);
    });
    const allTimeExpensesList = Object.keys(allTimeCategoryExpenses).map(name => ({ name, value: allTimeCategoryExpenses[name] })).sort((a,b) => b.value - a.value);

    // Goals (Emergency Fund logic)
    const goals = await prisma.goal.findMany({ where: { userId } });
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

    const totalHistoricalExpenses = historical.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const daysSinceThreeMonthsAgo = Math.max(1, Math.floor((now.getTime() - threeMonthsAgo.getTime()) / (1000 * 60 * 60 * 24)));
    const burnRate = totalHistoricalExpenses / daysSinceThreeMonthsAgo;
    const runwayDays = (burnRate > 0 && isFinite(burnRate)) ? Math.round(totalBalance / burnRate) : 999;

    let optimizationInsight = "Tus gastos están bajo control este mes. ¡Sigue así!";
    let debtAdvice = financialInsight; // Re-mapped the old debt advice to the effort insight

    // === USD/COP EXCHANGE RATE HISTORICAL (30 DAYS LIMIT) ===
    let usdHistory: any[] = [];
    let currentUsdPrice = 4000;
    try {
      const trmResponse = await fetch('https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=30&$order=vigenciadesde%20DESC');
      if (trmResponse.ok) {
        const data = await trmResponse.json();
        usdHistory = data.map((d: any) => ({
          date: d.vigenciadesde.split('T')[0],
          valor: Number(d.valor)
        })).reverse();
        if (data.length > 0) {
          currentUsdPrice = Number(data[0].valor);
        }
      }
    } catch (e) {
      console.warn('Could not fetch TRM', e);
    }
    
    res.json({
      historicalExpenses: historical.filter((t: any) => t.type === 'expense').map((t: any) => ({
        date: t.transactionDate.toISOString().split('T')[0],
        amount: Number(t.amount),
        category: t.category?.name || 'Sin categoría'
      })),
      debtAdvice,
      currentUsdPrice,
      usdHistory,
      totalBalance,
      currentMonthIncome,
      currentMonthExpense,
      netSavings,
      finScore: Math.round(finScore),
      burnRate,
      runwayDays,
      effortRate,
      financialInsight,
      creditUtilizationRate: Math.round(creditUtilizationRate * 10) / 10,
      currentMonthCreditUsage,
      currentMonthSavings,
      optimizationInsight,
      expensesDistribution,
      monthlyChart,
      creditCards,
      emergencyFundTotal,
      emergencyFundTarget,
      savingsTotal,
      globalSavingsGoal,
      allTimeExpensesList,
      recentTransactions: monthlyTransactions.sort((a: any,b: any)=>new Date(b.createdAt || b.transactionDate).getTime() - new Date(a.createdAt || a.transactionDate).getTime()).slice(0, 5),
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
