import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';
import {
  getCustomerProfile,
  updateCustomerProfile
} from './customer.controller.js';

export const customerProfileRoutes = Router();

customerProfileRoutes.use(requireAuth, requireRole('CUSTOMER'));
customerProfileRoutes.get('/', getCustomerProfile);
customerProfileRoutes.patch('/', updateCustomerProfile);
