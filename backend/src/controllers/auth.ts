import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'clearpath_super_secret_key_123';

export const register = async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, password, fullName, currency } = req.body;
    const email = rawEmail.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        currency: currency || 'COP',
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        currency: user.currency,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Tu cuenta ha sido creada pero aún no ha sido aprobada por un administrador.' });
    }
    
    if (user.status === 'rejected') {
       return res.status(403).json({ error: 'El acceso a esta cuenta ha sido denegado.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        currency: user.currency,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        currency: true,
        timezone: true,
        planType: true,
        role: true,
        status: true,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching user' });
  }
};

export const updateSettings = async (req: any, res: Response) => {
  try {
    const { globalSavingsGoal, currency, fullName } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        globalSavingsGoal: globalSavingsGoal !== undefined ? Number(globalSavingsGoal) : undefined,
        currency: currency !== undefined ? currency : undefined,
        fullName: fullName !== undefined ? fullName : undefined,
      },
    });
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      currency: user.currency,
      globalSavingsGoal: user.globalSavingsGoal,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating user settings' });
  }
};

import crypto from 'crypto';

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email: rawEmail } = req.body;
    const email = rawEmail.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      return res.json({ message: 'If that email is registered, we have sent a reset link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // In a real app, send an email here. We simulate it for now.
    console.log(`[EMAIL SIMULATION] Password reset requested for ${email}. Token: ${resetToken}`);

    res.json({ message: 'If that email is registered, we have sent a reset link.', _simulatedToken: resetToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
};
