import { Router, Request, Response } from 'express';

const router = Router();

// Health Check Endpoint
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

export const healthRoutes = router;
