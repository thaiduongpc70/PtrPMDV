import { asyncHandler } from '../../shared/http/async-handler.js';
import { healthService } from './health.service.js';

export const liveness = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(healthService.liveness());
});

export const readiness = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    res.json(await healthService.readiness());
  } catch {
    res.status(503).json(healthService.notReady());
  }
});
