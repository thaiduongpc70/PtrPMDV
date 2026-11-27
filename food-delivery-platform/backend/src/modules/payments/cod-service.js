/* Đối soát COD: PENDING → COLLECTED (tài xế của chuyến hoặc admin) → SETTLED (admin).
   Mọi thao tác khoá dòng giao dịch trong cùng transaction; giao dịch đã SETTLED không bị kéo ngược về COLLECTED. */
import { HttpError } from '../../shared/http/http-error.js';
import { M } from '../../shared/http/messages.js';

async function lockCod(connection, codId) {
  const rows = await connection.execute('SELECT id, shipper_id, status FROM cod_transactions WHERE id = ? FOR UPDATE', [codId]);
  if (!rows[0]) throw new HttpError(404, M.codNotFound);
  return rows[0];
}

/** `shipperId` khác null khi người gọi là tài xế: chỉ được thu COD của chính mình. */
export async function collectCod(connection, codId, { shipperId = null } = {}) {
  const row = await lockCod(connection, codId);
  if (shipperId !== null && Number(row.shipper_id) !== Number(shipperId)) throw new HttpError(403, M.permissionDenied);
  if (row.status === 'COLLECTED') return { id: Number(codId), status: 'COLLECTED' };
  if (row.status !== 'PENDING') throw new HttpError(409, M.codNotCollectable);
  await connection.execute(`UPDATE cod_transactions SET status = 'COLLECTED', collected_at = CURRENT_TIMESTAMP WHERE id = ?`, [codId]);
  return { id: Number(codId), status: 'COLLECTED' };
}

export async function settleCod(connection, codId) {
  const row = await lockCod(connection, codId);
  if (row.status === 'SETTLED') return { id: Number(codId), status: 'SETTLED' };
  if (row.status !== 'COLLECTED') throw new HttpError(409, M.codNotSettleable);
  await connection.execute(`UPDATE cod_transactions SET status = 'SETTLED', settled_at = CURRENT_TIMESTAMP WHERE id = ?`, [codId]);
  return { id: Number(codId), status: 'SETTLED' };
}
