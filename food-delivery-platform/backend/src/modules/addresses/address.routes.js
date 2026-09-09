import { Router } from 'express';
import {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress
} from './address.controller.js';
import { requireAuth, requireRole } from '../../shared/middlewares/require-auth.middleware.js';

export const addressRoutes = Router();

addressRoutes.use(requireAuth, requireRole('CUSTOMER'));
addressRoutes.get('/', listAddresses);
addressRoutes.post('/', createAddress);
addressRoutes.get('/:addressId', getAddress);
addressRoutes.patch('/:addressId', updateAddress);
addressRoutes.post('/:addressId/default', setDefaultAddress);
addressRoutes.delete('/:addressId', deleteAddress);
