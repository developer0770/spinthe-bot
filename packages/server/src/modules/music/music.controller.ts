import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

export const getPopular = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    if (type !== 'AUDIO' && type !== 'VIDEO') {
      return res.status(400).json({ error: 'invalid_type' });
    }
    const tracks = await prisma.track.findMany({
      where: {
        type: type,
        isPopular: true,
      },
      orderBy: { id: 'desc' },
      take: 20,
    });
    res.json(tracks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};

export const searchTracks = async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;
    if (type !== 'AUDIO' && type !== 'VIDEO') {
      return res.status(400).json({ error: 'invalid_type' });
    }
    const query = typeof q === 'string' ? q : '';
    const tracks = await prisma.track.findMany({
      where: {
        type: type,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    res.json(tracks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};
