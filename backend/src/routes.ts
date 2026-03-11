import { Router } from 'express';
import { authenticate } from './middleware/auth';
import { register, login, getMe, forgotPassword, resetPassword, updateSettings } from './controllers/auth';
import { getAccounts, createAccount, updateAccount, deleteAccount } from './controllers/accounts';
import { getCards, createCard, updateCard, deleteCard } from './controllers/cards';
import { getTransactions, createTransaction, deleteTransaction, payCreditCard, extraordinaryPayment } from './controllers/transactions';
import { getCategories, createCategory, seedCategories } from './controllers/categories';
import { getBudgets, createBudget, updateBudget, deleteBudget } from './controllers/budgets';
import { getDashboardSummary, simulateScenario } from './controllers/dashboard';
import { getRecurringTransactions, createRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } from './controllers/recurring';
import { getPendingUsers, approveUser, rejectUser } from './controllers/admin';
import { isAdmin } from './middlewares/isAdmin';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, getMe);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.put('/auth/settings', authenticate, updateSettings);

// Accounts
router.get('/accounts', authenticate, getAccounts);
router.post('/accounts', authenticate, createAccount);
router.put('/accounts/:id', authenticate, updateAccount);
router.delete('/accounts/:id', authenticate, deleteAccount);

// Cards
router.get('/cards', authenticate, getCards);
router.post('/cards', authenticate, createCard);
router.put('/cards/:id', authenticate, updateCard);
router.delete('/cards/:id', authenticate, deleteCard);

// Transactions
router.get('/transactions', authenticate, getTransactions);
router.post('/transactions', authenticate, createTransaction);
router.post('/transactions/extraordinary-payment', authenticate, extraordinaryPayment);
router.post('/transactions/pay-credit-card', authenticate, payCreditCard);
router.delete('/transactions/:id', authenticate, deleteTransaction);

// Categories
router.get('/categories', authenticate, getCategories);
router.post('/categories', authenticate, createCategory);
router.post('/categories/seed', authenticate, seedCategories);

// Budgets
router.get('/budgets', authenticate, getBudgets);
router.post('/budgets', authenticate, createBudget);
router.put('/budgets/:id', authenticate, updateBudget);
router.delete('/budgets/:id', authenticate, deleteBudget);

// Goals (Pockets and Emergency Fund)
import { getGoals, createGoal, updateGoal, deleteGoal } from './controllers/goals';
router.get('/goals', authenticate, getGoals);
router.post('/goals', authenticate, createGoal);
router.put('/goals/:id', authenticate, updateGoal);
router.delete('/goals/:id', authenticate, deleteGoal);

// Dashboard
router.get('/dashboard', authenticate, getDashboardSummary);
router.post('/dashboard/simulate', authenticate, simulateScenario);

// Recurring
router.get('/recurring', authenticate, getRecurringTransactions);
router.post('/recurring', authenticate, createRecurringTransaction);
router.put('/recurring/:id', authenticate, updateRecurringTransaction);
router.delete('/recurring/:id', authenticate, deleteRecurringTransaction);

// Admin (require authenticate + isAdmin)
router.get('/admin/users/pending', authenticate, isAdmin, getPendingUsers);
router.put('/admin/users/:id/approve', authenticate, isAdmin, approveUser);
router.delete('/admin/users/:id/reject', authenticate, isAdmin, rejectUser);

export default router;
