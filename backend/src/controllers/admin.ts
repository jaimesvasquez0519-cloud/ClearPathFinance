import { Request, Response } from 'express';
import { prisma } from '../db';

export const getPendingUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching pending users' });
  }
};

export const approveUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'active' },
    });
    
    res.json({ message: 'Usuario aprobado exitosamente', user: { id: user.id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error approving user' });
  }
};

export const rejectUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Podemos eliminarlo directamente o marcarlo como rechazado. Optaremos por eliminarlo para evitar ensuciar la base de datos de usuarios rechazados
    await prisma.user.delete({
      where: { id },
    });
    
    res.json({ message: 'Usuario rechazado/eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error rejecting user' });
  }
};
