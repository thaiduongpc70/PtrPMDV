import { Router } from 'express';
import { liveness, readiness } from './health.controller.js';

export const healthRoutes = Router();

healthRoutes.get('/', liveness);
healthRoutes.get('/live', liveness);
healthRoutes.get('/ready', readiness);
