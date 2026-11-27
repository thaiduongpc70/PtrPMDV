/* Xoá (qua API chủ quán) các nhóm topping không còn gắn món nào. Chạy khi server đang chạy. */
import { connect } from './lib/db.mjs';
import { api, tokenFor } from './lib/api-client.mjs';
const db = await connect();
const [orphans] = await db.query(`SELECT tg.id, tg.restaurant_id, tg.name, u.username FROM topping_groups tg
  JOIN restaurants r ON r.id = tg.restaurant_id JOIN users u ON u.id = r.owner_user_id
  WHERE NOT EXISTS (SELECT 1 FROM menu_item_topping_groups l WHERE l.topping_group_id = tg.id)`);
for (const group of orphans) {
  await api('DELETE', `/api/restaurant/restaurants/${group.restaurant_id}/topping-groups/${group.id}`, { token: await tokenFor(group.username) });
  console.log('xoá', group.restaurant_id, group.name);
}
console.log(`Đã xoá ${orphans.length} nhóm không dùng.`);
await db.end();
