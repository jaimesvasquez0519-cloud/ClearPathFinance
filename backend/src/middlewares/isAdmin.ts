import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const isAdmin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar permisos.' });
  }
};
