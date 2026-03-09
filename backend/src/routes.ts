import { Router } from 'express';
import { authenticate } from './middleware/auth';
import { register, login, getMe } from './controllers/auth';
import { getAccounts, createAccount, updateAccount, deleteAccount } from './controllers/accounts';
import { getCards, createCard, updateCard, deleteCard } from './controllers/cards';
import { getTransactions, createTransaction, deleteTransaction, payCreditCard } from './controllers/transactions';
import { getCategories, createCategory } from './controllers/categories';
import { getBudgets, createBudget, updateBudget, deleteBudget } from './controllers/budgets';
import { getDashboardSummary } from './controllers/dashboard';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, getMe);

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
router.post('/transactions/pay-card', authenticate, payCreditCard);
router.delete('/transactions/:id', authenticate, deleteTransaction);

// Categories
router.get('/categories', authenticate, getCategories);
router.post('/categories', authenticate, createCategory);

// Budgets
router.get('/budgets', authenticate, getBudgets);
router.post('/budgets', authenticate, createBudget);
router.put('/budgets/:id', authenticate, updateBudget);
router.delete('/budgets/:id', authenticate, deleteBudget);

// Dashboard
router.get('/dashboard', authenticate, getDashboardSummary);

export default router;
