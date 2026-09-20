import { asyncHandler } from '../../shared/http/async-handler.js';
import { authService } from './auth.service.js';

export const registerCustomer = asyncHandler(async (req, res) => {
  const result = await authService.registerCustomer(req.body);
  req.auditUserId = result.user.id;
  req.auditEntityId = result.user.id;

  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  req.auditUserId = result.user.id;
  req.auditEntityId = result.user.id;

  res.json(result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.body?.refreshToken);
  req.auditUserId = result.user.id;
  req.auditEntityId = result.user.id;

  res.json(result);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body?.refreshToken);
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.json(user);
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body);
  req.auditEntityType = 'USER';
  req.auditAction = 'PASSWORD_RESET_REQUEST';

  res.json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  req.auditEntityType = 'USER';
  req.auditAction = 'PASSWORD_RESET_CONFIRM';

  res.json(result);
});

export const requestEmailVerification = asyncHandler(async (req, res) => {
  const result = await authService.requestEmailVerification(req.body);
  req.auditEntityType = 'USER';
  req.auditAction = 'EMAIL_VERIFICATION_REQUEST';

  res.json(result);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body?.token);
  req.auditUserId = result.user.id;
  req.auditEntityId = result.user.id;
  req.auditEntityType = 'USER';
  req.auditAction = 'EMAIL_VERIFICATION_CONFIRM';

  res.json(result);
});
