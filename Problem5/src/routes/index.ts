import { Router, Request, Response } from 'express';
import resourceRoutes from './resource.routes';
import config from '../config';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
router.use('/resources', resourceRoutes);

export default router;
