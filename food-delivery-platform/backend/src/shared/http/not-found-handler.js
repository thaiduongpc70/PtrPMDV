import { M } from './messages.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    message: M.routeNotFound
  });
}
