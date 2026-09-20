import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/require-auth.middleware.js';
import {
  login,
  logout,
  me,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
  refreshToken,
  registerCustomer,
  verifyEmail
} from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/register/customer', registerCustomer);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refreshToken);
authRoutes.post('/logout', logout);
authRoutes.post('/password/forgot', requestPasswordReset);
authRoutes.post('/password/reset', resetPassword);
authRoutes.post('/email/verification/request', requestEmailVerification);
authRoutes.post('/email/verification/confirm', verifyEmail);
authRoutes.get('/me', requireAuth, me);
