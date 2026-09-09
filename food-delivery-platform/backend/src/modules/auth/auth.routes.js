import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/require-auth.middleware.js';
import {
  login,
  logout,
  me,
  refreshToken,
  registerCustomer
} from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/register/customer', registerCustomer);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refreshToken);
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, me);
