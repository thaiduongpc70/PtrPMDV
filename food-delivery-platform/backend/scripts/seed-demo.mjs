import { hashPassword } from '../src/shared/security/password.js';
import { closePool, getPool, withTransaction } from '../src/shared/database/mysql.js';

const demoPassword = process.env.DEMO_PASSWORD || 'FoodDemo!2026';
const pool = getPool();

try {
  const restaurantRole = await findRole('RESTAURANT');
  const customerRole = await findRole('CUSTOMER');
  const shipperRole = await findRole('SHIPPER');
  const adminRole = await findRole('ADMIN');
  await ensureUser({ username: 'demo.admin', email: 'admin.demo@fooddelivery.local', roleId: adminRole, phone: '0901000000' });
  const restaurantOwner = await ensureUser({ username: 'demo.restaurant', email: 'restaurant.demo@fooddelivery.local', roleId: restaurantRole, phone: '0901000001' });
  const customer = await ensureUser({ username: 'demo.customer', email: 'customer.demo@fooddelivery.local', roleId: customerRole, phone: '0901000002' });
  const shipper = await ensureUser({ username: 'demo.shipper', email: 'shipper.demo@fooddelivery.local', roleId: shipperRole, phone: '0901000003' });
  await ensureCustomerProfile(customer.id);
  await ensureShipperProfile(shipper.id);
  await ensureCustomerAddress(customer.id);

  const categoryIds = await ensureRestaurantCategories();
  const restaurantIds = [];
  for (let index = 1; index <= 20; index += 1) {
    const restaurantId = await ensureRestaurant(restaurantOwner.id, categoryIds[(index - 1) % categoryIds.length], index);
    restaurantIds.push(restaurantId);
    await ensureRestaurantContent(restaurantId, index);
  }

  const itemCount = await scalar('SELECT COUNT(*) AS total FROM menu_items WHERE deleted_at IS NULL');
  console.log(JSON.stringify({ restaurants: restaurantIds.length, menuItems: itemCount, demoPassword }));
} finally {
  await closePool();
}

async function findRole(name) {
  const [rows] = await pool.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [name]);
  if (!rows[0]) throw new Error(`Role ${name} is missing; import food_delivery_db.sql first`);
  return Number(rows[0].id);
}

async function ensureUser(input) {
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [input.email]);
  if (rows[0]) return { id: Number(rows[0].id) };
  const passwordHash = await hashPassword(demoPassword);
  const [result] = await pool.execute(
    `INSERT INTO users (role_id, username, email, phone, password_hash, status, email_verified_at)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)`, [input.roleId, input.username, input.email, input.phone, passwordHash]
  );
  return { id: Number(result.insertId) };
}

async function ensureCustomerProfile(userId) {
  const [rows] = await pool.execute('SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows[0]) await pool.execute('INSERT INTO customer_profiles (user_id, full_name) VALUES (?, ?)', [userId, 'Demo Customer']);
}

async function ensureShipperProfile(userId) {
  const [rows] = await pool.execute('SELECT id FROM shipper_profiles WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows[0]) await pool.execute(`INSERT INTO shipper_profiles (user_id, full_name, availability_status) VALUES (?, 'Demo Shipper', 'AVAILABLE')`, [userId]);
}

async function ensureCustomerAddress(userId) {
  const [rows] = await pool.execute(`SELECT ca.id FROM customer_addresses ca INNER JOIN customer_profiles cp ON cp.id = ca.customer_id WHERE cp.user_id = ? AND ca.deleted_at IS NULL LIMIT 1`, [userId]);
  if (!rows[0]) {
    const [profile] = await pool.execute('SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1', [userId]);
    await pool.execute(`INSERT INTO customer_addresses (customer_id, label, receiver_name, receiver_phone, address_line, ward, district, city, is_default) VALUES (?, 'Home', 'Demo Customer', '0901000002', '1 Demo Street', 'Ward 1', 'District 1', 'Ho Chi Minh', TRUE)`, [profile[0].id]);
  }
}

async function ensureRestaurantCategories() {
  const names = ['Vietnamese', 'Noodles', 'Fast food', 'Drinks', 'Dessert'];
  const ids = [];
  for (const name of names) {
    const [rows] = await pool.execute('SELECT id FROM restaurant_categories WHERE name = ? LIMIT 1', [name]);
    if (rows[0]) ids.push(Number(rows[0].id));
    else { const [result] = await pool.execute('INSERT INTO restaurant_categories (name, description, status) VALUES (?, ?, \'ACTIVE\')', [name, `${name} demo category`]); ids.push(Number(result.insertId)); }
  }
  return ids;
}

async function ensureRestaurant(ownerId, categoryId, index) {
  const name = `Demo Kitchen ${String(index).padStart(2, '0')}`;
  const [rows] = await pool.execute('SELECT id FROM restaurants WHERE name = ? LIMIT 1', [name]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await pool.execute(`INSERT INTO restaurants (owner_user_id, category_id, name, description, phone, address, district, city, opening_time, closing_time, minimum_order, average_prepare_time, commission_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '07:00:00', '22:00:00', 30000, 25, 15, 'ACTIVE')`, [ownerId, categoryId, name, `Demo restaurant ${index}`, `0283800${String(index).padStart(4, '0')}`, `${index} Food Street`, 'District 1', 'Ho Chi Minh']);
  return Number(result.insertId);
}

async function ensureRestaurantContent(restaurantId, index) {
  const [menuRows] = await pool.execute('SELECT id FROM menus WHERE restaurant_id = ? AND name = ? LIMIT 1', [restaurantId, 'All-day menu']);
  const menuId = menuRows[0] ? Number(menuRows[0].id) : Number((await pool.execute(`INSERT INTO menus (restaurant_id, name, description, status) VALUES (?, 'All-day menu', 'Demo menu', 'ACTIVE')`, [restaurantId]))[0].insertId);
  const [categoryRows] = await pool.execute('SELECT id FROM menu_categories WHERE restaurant_id = ? AND name = ? LIMIT 1', [restaurantId, 'Popular']);
  const categoryId = categoryRows[0] ? Number(categoryRows[0].id) : Number((await pool.execute(`INSERT INTO menu_categories (restaurant_id, menu_id, name, description, status) VALUES (?, ?, 'Popular', 'Demo category', 'ACTIVE')`, [restaurantId, menuId]))[0].insertId);
  const [groupRows] = await pool.execute('SELECT id FROM topping_groups WHERE restaurant_id = ? AND name = ? LIMIT 1', [restaurantId, 'Add-ons']);
  const groupId = groupRows[0] ? Number(groupRows[0].id) : Number((await pool.execute(`INSERT INTO topping_groups (restaurant_id, name, min_select, max_select, required) VALUES (?, 'Add-ons', 0, 2, FALSE)`, [restaurantId]))[0].insertId);
  const [toppingRows] = await pool.execute('SELECT id FROM toppings WHERE group_id = ? LIMIT 1', [groupId]);
  if (!toppingRows[0]) await pool.execute(`INSERT INTO toppings (group_id, name, price, status) VALUES (?, 'Extra sauce', 5000, 'ACTIVE'), (?, 'Extra herbs', 3000, 'ACTIVE')`, [groupId, groupId]);
  const existing = await scalar('SELECT COUNT(*) AS total FROM menu_items WHERE restaurant_id = ? AND deleted_at IS NULL', [restaurantId]);
  const missing = Math.max(0, 105 - existing);
  if (missing > 0) {
    const values = [];
    for (let item = existing + 1; item <= existing + missing; item += 1) values.push([restaurantId, categoryId, `Demo dish ${index}-${item}`, `Demo description ${item}`, `/uploads/menu-items/demo-${index}-${item}.jpg`, 35000 + (item % 12) * 5000, item % 7 === 0 ? 30000 + (item % 12) * 5000 : null, 15 + (item % 20), item % 9 !== 0, item % 10 === 0]);
    for (let offset = 0; offset < values.length; offset += 100) {
      const batch = values.slice(offset, offset + 100);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      await pool.execute(`INSERT INTO menu_items (restaurant_id, category_id, name, description, image_url, base_price, discount_price, preparation_time, is_available, is_featured) VALUES ${placeholders}`, batch.flat());
    }
  }
  const [items] = await pool.execute('SELECT id FROM menu_items WHERE restaurant_id = ? AND deleted_at IS NULL LIMIT 105', [restaurantId]);
  for (const item of items) await pool.execute('INSERT IGNORE INTO menu_item_topping_groups (menu_item_id, topping_group_id) VALUES (?, ?)', [item.id, groupId]);
}

async function scalar(sql, params = []) { const [rows] = await pool.execute(sql, params); return Number(rows[0]?.total ?? 0); }
