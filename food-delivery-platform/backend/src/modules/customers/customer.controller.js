import { asyncHandler } from '../../shared/http/async-handler.js';
import { customerService } from './customer.service.js';

export const getCustomerProfile = asyncHandler(async (req, res) => {
  const profile = await customerService.getProfile(req.user.id);
  req.auditUserId = req.user.id;
  req.auditEntityId = profile.customerId;
  req.auditEntityType = 'CUSTOMER_PROFILE';
  req.auditAction = 'CUSTOMER_PROFILE_VIEW';

  res.json(profile);
});

export const updateCustomerProfile = asyncHandler(async (req, res) => {
  const result = await customerService.updateProfile(req.user.id, req.body);
  req.auditUserId = req.user.id;
  req.auditEntityId = result.profile.customerId;
  req.auditEntityType = 'CUSTOMER_PROFILE';
  req.auditAction = 'CUSTOMER_PROFILE_UPDATE';
  req.auditOldValues = result.audit.oldValues;
  req.auditNewValues = result.audit.newValues;

  res.json(result.profile);
});
