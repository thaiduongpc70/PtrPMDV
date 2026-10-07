import { hashPassword } from '../src/shared/security/password.js';
import { closePool, getPool } from '../src/shared/database/mysql.js';

const systemOwner = {
  fullName: 'Lê Nguyễn Thái Dương',
  username: 'thaiduongpc7',
  email: 'thaiduongpc70@gmail.com',
  phone: '0852076750'
};

const seedPassword = process.env.SEED_PASSWORD || process.env.DEMO_PASSWORD || 'duong2k5';
const pool = getPool();

const accounts = {
  admin: {
    username: systemOwner.username,
    email: systemOwner.email,
    phone: systemOwner.phone,
    role: 'ADMIN'
  },
  restaurant: {
    username: 'saigon.bites',
    email: 'owner@saigonbites.vn',
    phone: '0901001001',
    role: 'RESTAURANT'
  },
  customer: {
    username: 'minh.anh',
    email: 'minhanh.nguyen@example.vn',
    phone: '0901001002',
    role: 'CUSTOMER'
  },
  shipper: {
    username: 'bao.shipper',
    email: 'bao.tran@shipper.vn',
    phone: '0901001003',
    role: 'SHIPPER'
  }
};

const categorySeeds = [
  { name: 'Cơm', description: 'Cơm văn phòng, cơm gia đình và cơm phần nóng hổi', imageUrl: '/uploads/categories/com.jpg' },
  { name: 'Bún - Phở', description: 'Phở, bún, miến, hủ tiếu và các món nước Việt Nam', imageUrl: '/uploads/categories/bun-pho.jpg' },
  { name: 'Đồ ăn nhanh', description: 'Burger, khoai tây, combo nhanh cho bữa trưa', imageUrl: '/uploads/categories/fast-food.jpg' },
  { name: 'Gà rán', description: 'Gà rán, gà sốt cay, gà nướng và combo gia đình', imageUrl: '/uploads/categories/ga-ran.jpg' },
  { name: 'Pizza', description: 'Pizza đế mỏng, đế dày, mì Ý và món Âu phổ biến', imageUrl: '/uploads/categories/pizza.jpg' },
  { name: 'Trà sữa', description: 'Trà sữa, trà trái cây, topping và đồ uống đá xay', imageUrl: '/uploads/categories/tra-sua.jpg' },
  { name: 'Đồ uống', description: 'Cà phê, nước ép, sinh tố và đồ uống giải khát', imageUrl: '/uploads/categories/do-uong.jpg' },
  { name: 'Đồ ăn vặt', description: 'Bánh tráng, xiên que, há cảo, chè và món ăn nhẹ', imageUrl: '/uploads/categories/an-vat.jpg' },
  { name: 'Đồ chay', description: 'Cơm chay, bún chay, món rau củ và suất ăn lành mạnh', imageUrl: '/uploads/categories/do-chay.jpg' },
  { name: 'Món Việt', description: 'Món Việt truyền thống, đặc sản vùng miền và món gia đình', imageUrl: '/uploads/categories/mon-viet.jpg' }
];

const restaurantSeeds = [
  ['Bếp Nhà An Nhiên', 'Món Việt gia đình, cơm phần và canh nóng mỗi ngày', 'Cơm', '12 Nguyễn Thị Minh Khai', 'Phường Bến Nghé', 'Quận 1', 10.782352, 106.700423],
  ['Phở Gánh Ba Mươi Sáu', 'Phở bò, phở gà và nước dùng hầm xương trong ngày', 'Bún - Phở', '36 Lê Thánh Tôn', 'Phường Bến Nghé', 'Quận 1', 10.778331, 106.704172],
  ['Cơm Tấm Sườn Mộc', 'Cơm tấm sườn nướng than, bì chả và nước mắm pha tay', 'Cơm', '58 Cao Thắng', 'Phường 4', 'Quận 3', 10.772242, 106.682076],
  ['Gà Giòn Bếp Đỏ', 'Gà rán giòn, gà sốt cay và combo nhóm', 'Gà rán', '142 Nguyễn Tri Phương', 'Phường 9', 'Quận 5', 10.754935, 106.668137],
  ['Pizza Lò Gạch', 'Pizza thủ công, mì Ý và salad dùng nguyên liệu tươi', 'Pizza', '21 Võ Văn Tần', 'Phường 6', 'Quận 3', 10.775263, 106.689143],
  ['Trà Sữa Lá Non', 'Trà sữa, trà trái cây, kem cheese và topping nhà làm', 'Trà sữa', '88 Nguyễn Gia Trí', 'Phường 25', 'Bình Thạnh', 10.803533, 106.713311],
  ['Bún Bò Cố Đô', 'Bún bò Huế, chả cua, giò heo và sa tế cay thơm', 'Bún - Phở', '19A Phan Xích Long', 'Phường 2', 'Phú Nhuận', 10.799517, 106.686905],
  ['Bếp Chay Sen Vàng', 'Món chay cân bằng, cơm gạo lứt và nước ép rau củ', 'Đồ chay', '45 Trần Quốc Toản', 'Phường Võ Thị Sáu', 'Quận 3', 10.787583, 106.687136],
  ['Burger Phố Nướng', 'Burger bò, gà nướng, khoai tây và soda thủ công', 'Đồ ăn nhanh', '71 Hoàng Sa', 'Phường Đa Kao', 'Quận 1', 10.790471, 106.696672],
  ['Quán Vặt Cô Ba', 'Bánh tráng, xiên que, há cảo, chè và món ăn nhẹ', 'Đồ ăn vặt', '102 Nguyễn Văn Cừ', 'Phường Nguyễn Cư Trinh', 'Quận 1', 10.761647, 106.682337],
  ['Cà Phê Sớm Mai', 'Cà phê phin, bạc xỉu, nước ép và bánh mì nhỏ', 'Đồ uống', '5 Pasteur', 'Phường Nguyễn Thái Bình', 'Quận 1', 10.771281, 106.704915],
  ['Bánh Mì Lò Than', 'Bánh mì thịt nướng, chả lụa, pate và đồ uống mang đi', 'Món Việt', '217 Lý Tự Trọng', 'Phường Bến Thành', 'Quận 1', 10.772735, 106.694923],
  ['Hủ Tiếu Nam Vang An Lạc', 'Hủ tiếu khô, hủ tiếu nước và topping hải sản', 'Bún - Phở', '64 Nguyễn Trãi', 'Phường 3', 'Quận 5', 10.756955, 106.670604],
  ['Cơm Gà Hội An Bếp Vàng', 'Cơm gà xé, gà quay, rau răm và nước dùng nghệ', 'Cơm', '30 Trần Hưng Đạo', 'Phường Phạm Ngũ Lão', 'Quận 1', 10.767721, 106.694844],
  ['Mì Ý Sốt Nhà Làm', 'Mì Ý, lasagna, súp kem và bánh mì bơ tỏi', 'Pizza', '11 Trương Định', 'Phường Võ Thị Sáu', 'Quận 3', 10.782179, 106.690984],
  ['Gỏi Cuốn Tươi Mỗi Ngày', 'Gỏi cuốn, bì cuốn, nước chấm đậu phộng và món nhẹ', 'Món Việt', '91 Nguyễn Hữu Cầu', 'Phường Tân Định', 'Quận 1', 10.793582, 106.690245],
  ['Lẩu Ly Đêm Sài Gòn', 'Lẩu ly, tokbokki, viên thả lẩu và mì cay', 'Đồ ăn vặt', '22 Phạm Văn Đồng', 'Phường 3', 'Gò Vấp', 10.828529, 106.680498],
  ['Nước Ép Mùa Xanh', 'Nước ép nguyên chất, sinh tố và granola cup', 'Đồ uống', '49 Lê Văn Sỹ', 'Phường 13', 'Quận 3', 10.787021, 106.677947],
  ['Bếp Bắc Nhỏ', 'Bún chả, nem rán, miến ngan và món Bắc mỗi ngày', 'Món Việt', '117 Điện Biên Phủ', 'Phường 15', 'Bình Thạnh', 10.801941, 106.710893],
  ['Cháo Đêm Ấm Bụng', 'Cháo sườn, cháo gà, trứng bắc thảo và quẩy nóng', 'Món Việt', '74 Cống Quỳnh', 'Phường Phạm Ngũ Lão', 'Quận 1', 10.767125, 106.690087]
];

const restaurantOwnerPresets = [
  ['bep.annhien', 'owner01@fooddelivery.local', '0902001001'],
  ['pho.ganh36', 'owner02@fooddelivery.local', '0902001002'],
  ['comtam.suonmoc', 'owner03@fooddelivery.local', '0902001003'],
  ['gagion.bepdo', 'owner04@fooddelivery.local', '0902001004'],
  ['pizza.logach', 'owner05@fooddelivery.local', '0902001005'],
  ['trasua.lanon', 'owner06@fooddelivery.local', '0902001006'],
  ['bunbo.cododo', 'owner07@fooddelivery.local', '0902001007'],
  ['bepchay.senvang', 'owner08@fooddelivery.local', '0902001008'],
  ['burger.phonuong', 'owner09@fooddelivery.local', '0902001009'],
  ['quanvat.coba', 'owner10@fooddelivery.local', '0902001010'],
  ['caphe.sommai', 'owner11@fooddelivery.local', '0902001011'],
  ['banhmi.lothan', 'owner12@fooddelivery.local', '0902001012'],
  ['hutieu.anlac', 'owner13@fooddelivery.local', '0902001013'],
  ['comga.hoian', 'owner14@fooddelivery.local', '0902001014'],
  ['miy.sotnha', 'owner15@fooddelivery.local', '0902001015'],
  ['goicuon.tuoingay', 'owner16@fooddelivery.local', '0902001016'],
  ['lauly.demsg', 'owner17@fooddelivery.local', '0902001017'],
  ['nuocep.muaxanh', 'owner18@fooddelivery.local', '0902001018'],
  ['bepbac.nho', 'owner19@fooddelivery.local', '0902001019'],
  ['chao.dembung', 'owner20@fooddelivery.local', '0902001020']
];

const dishCatalog = {
  'Cơm': ['Cơm sườn nướng', 'Cơm gà xối mỡ', 'Cơm bò lúc lắc', 'Cơm cá kho tộ', 'Cơm thịt kho trứng', 'Cơm rang hải sản', 'Cơm gà sốt tiêu', 'Cơm heo quay'],
  'Bún - Phở': ['Phở bò tái', 'Phở gà xé', 'Bún bò Huế', 'Bún riêu cua', 'Hủ tiếu Nam Vang', 'Miến gà', 'Bún thịt nướng', 'Bánh canh cua'],
  'Đồ ăn nhanh': ['Burger bò phô mai', 'Burger gà nướng', 'Khoai tây chiên', 'Hotdog xúc xích', 'Combo burger', 'Sandwich gà', 'Nuggets gà', 'Salad gà giòn'],
  'Gà rán': ['Gà rán truyền thống', 'Gà sốt cay Hàn Quốc', 'Cánh gà mật ong', 'Đùi gà giòn cay', 'Gà không xương', 'Combo gà gia đình', 'Gà sốt phô mai', 'Gà nướng BBQ'],
  'Pizza': ['Pizza hải sản', 'Pizza bò bằm', 'Pizza phô mai', 'Pizza gà BBQ', 'Mì Ý bò bằm', 'Mì Ý kem nấm', 'Lasagna bò', 'Salad cá ngừ'],
  'Trà sữa': ['Trà sữa trân châu', 'Trà đào cam sả', 'Trà ô long kem cheese', 'Sữa tươi trân châu đường đen', 'Trà vải', 'Matcha latte', 'Chocolate đá xay', 'Trà nhài mật ong'],
  'Đồ uống': ['Cà phê sữa đá', 'Bạc xỉu', 'Nước cam ép', 'Sinh tố bơ', 'Nước ép ổi', 'Trà tắc mật ong', 'Cacao đá', 'Sữa chua trái cây'],
  'Đồ ăn vặt': ['Bánh tráng trộn', 'Há cảo hấp', 'Xiên que nướng', 'Tokbokki cay', 'Chè khúc bạch', 'Khoai lang kén', 'Bắp xào tép', 'Súp cua'],
  'Đồ chay': ['Cơm gạo lứt chay', 'Bún Huế chay', 'Nấm kho tiêu', 'Đậu hũ sốt nấm', 'Gỏi cuốn chay', 'Mì xào rau củ', 'Cà ri chay', 'Canh rong biển'],
  'Món Việt': ['Bánh mì thịt nướng', 'Bún chả Hà Nội', 'Gỏi cuốn tôm thịt', 'Cháo sườn', 'Nem rán', 'Bánh xèo', 'Mì Quảng', 'Cao lầu']
};

const signatureStyles = [
  'sốt nhà làm',
  'ít dầu',
  'đậm vị',
  'kiểu bếp trưởng',
  'phiên bản cay nhẹ',
  'nướng thơm',
  'topping chọn lọc',
  'chuẩn vị quán'
];

const portionStyles = [
  'suất tiêu chuẩn',
  'suất đầy đặn',
  'phần tiết kiệm',
  'size lớn',
  'combo no bụng',
  'bản đặc biệt'
];

const ingredientAccents = [
  'rau tươi Đà Lạt',
  'sốt tiêu xanh',
  'nước chấm pha tay',
  'phô mai kéo sợi',
  'mật ong thơm',
  'lá chanh giòn',
  'rang mộc',
  'ít đường',
  'sa tế nhà làm',
  'bơ tỏi',
  'hạt điều rang',
  'nấm áp chảo',
  'trứng lòng đào',
  'xốt mè rang',
  'hành phi giòn',
  'thảo mộc nướng',
  'muối ớt xanh'
];

const servingMoments = [
  'bữa sáng',
  'bữa trưa văn phòng',
  'bữa tối gia đình',
  'ăn nhẹ buổi chiều',
  'set cuối tuần',
  'phần bán chạy',
  'phiên bản mới',
  'đặt nhóm'
];

try {
  const roles = {
    ADMIN: await findRole('ADMIN'),
    RESTAURANT: await findRole('RESTAURANT'),
    CUSTOMER: await findRole('CUSTOMER'),
    SHIPPER: await findRole('SHIPPER')
  };

  await archiveLegacyDemoArtifacts();

  const admin = await ensureUser({ ...accounts.admin, roleId: roles.ADMIN });
  const customer = await ensureUser({ ...accounts.customer, roleId: roles.CUSTOMER });
  const shipper = await ensureUser({ ...accounts.shipper, roleId: roles.SHIPPER });
  const restaurantOwners = [];
  for (let index = 0; index < restaurantSeeds.length; index += 1) {
    restaurantOwners.push(await ensureUser(buildRestaurantOwner(index, roles.RESTAURANT)));
  }
  await ensureSystemOwnerSettings(admin.id);

  const customerProfileId = await ensureCustomerProfile(customer.id);
  const shipperProfileId = await ensureShipperProfile(shipper.id, admin.id);
  const customerAddressId = await ensureCustomerAddress(customerProfileId);
  await ensureWallet(customer.id);
  await ensureNotificationPreferences([admin.id, customer.id, shipper.id, ...restaurantOwners.map(owner => owner.id)]);

  const categories = await ensureRestaurantCategories();
  const restaurantIds = [];
  for (let index = 0; index < restaurantSeeds.length; index += 1) {
    const restaurantId = await ensureRestaurant(restaurantOwners[index].id, categories, restaurantSeeds[index], index + 1);
    restaurantIds.push(restaurantId);
    await ensureRestaurantContent(restaurantId, restaurantSeeds[index], index + 1);
  }

  await ensureBanners();
  await ensurePromotions(restaurantIds);
  await ensureDeliveredReviewOrders(customerProfileId, customerAddressId, shipperProfileId, restaurantIds);
  await ensureFavorites(customerProfileId, restaurantIds);
  await ensureSearchHistory(customerProfileId);
  await ensureSupportTicket(customer.id, admin.id);
  await ensureNotifications({ adminId: admin.id, restaurantOwnerId: restaurantOwners[0].id, customerId: customer.id, shipperId: shipper.id });

  const itemCount = await scalar(
    `SELECT COUNT(*) AS total
     FROM menu_items mi
     INNER JOIN restaurants r ON r.id = mi.restaurant_id
     WHERE mi.deleted_at IS NULL
       AND r.deleted_at IS NULL
       AND r.status = 'ACTIVE'`
  );
  console.log(JSON.stringify({
    seed: 'realistic',
    owner: systemOwner.fullName,
    accounts: {
      admin: accounts.admin.username,
      restaurant: restaurantOwnerPresets.slice(0, 5).map(item => item[0]),
      customer: accounts.customer.username,
      shipper: accounts.shipper.username
    },
    password: seedPassword,
    restaurants: restaurantIds.length,
    menuItems: itemCount
  }, null, 2));
} finally {
  await closePool();
}

function buildRestaurantOwner(index, roleId) {
  const preset = restaurantOwnerPresets[index] ?? [
    `restaurant${String(index + 1).padStart(2, '0')}`,
    `owner${String(index + 1).padStart(2, '0')}@fooddelivery.local`,
    `090200${String(index + 1).padStart(4, '0')}`
  ];
  return {
    username: preset[0],
    email: preset[1],
    phone: preset[2],
    role: 'RESTAURANT',
    roleId
  };
}

async function findRole(name) {
  const [rows] = await pool.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [name]);
  if (!rows[0]) throw new Error(`Role ${name} is missing; import food_delivery_db.sql first`);
  return Number(rows[0].id);
}

async function archiveLegacyDemoArtifacts() {
  await pool.execute(
    `UPDATE restaurants
     SET status = 'INACTIVE', deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
     WHERE deleted_at IS NULL
       AND (name LIKE 'Demo Kitchen %' OR name = 'Smoke Import Kitchen')`
  );
  await pool.execute(
    `UPDATE users
     SET status = 'INACTIVE', deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
     WHERE deleted_at IS NULL
       AND (
         username IN ('demo.admin', 'demo.restaurant', 'demo.customer', 'demo.shipper', 'ops.admin', 'customer01', 'saigon.bites')
         OR email LIKE '%.demo@fooddelivery.local'
       )`
  );
}

async function ensureUser(input) {
  const passwordHash = await hashPassword(seedPassword);
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? OR username = ? OR phone = ? LIMIT 1', [input.email, input.username, input.phone]);
  if (rows[0]) {
    await pool.execute(
      `UPDATE users
       SET role_id = ?, username = ?, email = ?, phone = ?, password_hash = ?, status = 'ACTIVE',
           email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
           phone_verified_at = COALESCE(phone_verified_at, CURRENT_TIMESTAMP)
       WHERE id = ?`,
      [input.roleId, input.username, input.email, input.phone, passwordHash, rows[0].id]
    );
    return { id: Number(rows[0].id) };
  }
  const [result] = await pool.execute(
    `INSERT INTO users (role_id, username, email, phone, password_hash, status, email_verified_at, phone_verified_at)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [input.roleId, input.username, input.email, input.phone, passwordHash]
  );
  return { id: Number(result.insertId) };
}

async function ensureSystemOwnerSettings(adminUserId) {
  const settings = [
    ['app.owner.name', systemOwner.fullName, 'Tên chủ tài khoản quản trị chính'],
    ['app.owner.username', systemOwner.username, 'Username quản trị chính'],
    ['app.owner.email', systemOwner.email, 'Email quản trị chính'],
    ['app.owner.phone', systemOwner.phone, 'Số điện thoại quản trị chính']
  ];
  for (const [key, value, description] of settings) {
    await pool.execute(
      `INSERT INTO system_settings (setting_key, setting_value, data_type, description, updated_by)
       VALUES (?, ?, 'STRING', ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description), updated_by = VALUES(updated_by)`,
      [key, value, description, adminUserId]
    );
  }
}

async function ensureCustomerProfile(userId) {
  const [rows] = await pool.execute('SELECT id FROM customer_profiles WHERE user_id = ? LIMIT 1', [userId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await pool.execute(
    `INSERT INTO customer_profiles (user_id, full_name, date_of_birth, gender, loyalty_points)
     VALUES (?, 'Nguyễn Minh Anh', '1998-04-12', 'FEMALE', 120)`,
    [userId]
  );
  return Number(result.insertId);
}

async function ensureShipperProfile(userId, adminUserId) {
  const [rows] = await pool.execute('SELECT id FROM shipper_profiles WHERE user_id = ? LIMIT 1', [userId]);
  const shipperId = rows[0]
    ? Number(rows[0].id)
    : Number((await pool.execute(
      `INSERT INTO shipper_profiles
       (user_id, full_name, identity_number, vehicle_type, vehicle_plate, driving_license, rating, total_reviews, total_deliveries, total_earnings, availability_status, current_latitude, current_longitude, last_location_at)
       VALUES (?, 'Trần Quốc Bảo', '079098012345', 'MOTORBIKE', '59B1-678.90', 'GPLX-A1-2026-0091', 4.80, 24, 128, 7850000, 'AVAILABLE', 10.7769000, 106.7009000, CURRENT_TIMESTAMP)`,
      [userId]
    ))[0].insertId);

  const documents = [
    ['IDENTITY_CARD', '079098012345', '/uploads/shippers/bao-cccd.jpg'],
    ['DRIVING_LICENSE', 'GPLX-A1-2026-0091', '/uploads/shippers/bao-gplx.jpg'],
    ['VEHICLE_REGISTRATION', '59B1-678.90', '/uploads/shippers/bao-dang-ky-xe.jpg']
  ];
  for (const [type, number, imageUrl] of documents) {
    const [docRows] = await pool.execute(
      'SELECT id FROM shipper_documents WHERE shipper_id = ? AND document_type = ? LIMIT 1',
      [shipperId, type]
    );
    if (!docRows[0]) {
      await pool.execute(
        `INSERT INTO shipper_documents (shipper_id, document_type, document_number, image_url, verified, verified_by, verified_at)
         VALUES (?, ?, ?, ?, TRUE, ?, CURRENT_TIMESTAMP)`,
        [shipperId, type, number, imageUrl, adminUserId]
      );
    }
  }
  return shipperId;
}

async function ensureCustomerAddress(customerProfileId) {
  const [rows] = await pool.execute('SELECT id FROM customer_addresses WHERE customer_id = ? AND deleted_at IS NULL LIMIT 1', [customerProfileId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await pool.execute(
    `INSERT INTO customer_addresses
     (customer_id, label, receiver_name, receiver_phone, address_line, ward, district, city, latitude, longitude, is_default)
     VALUES (?, 'Nhà riêng', 'Nguyễn Minh Anh', '0901001002', '25 Nguyễn Văn Nguyễn', 'Phường Tân Định', 'Quận 1', 'TP.HCM', 10.7901000, 106.6907000, TRUE)`,
    [customerProfileId]
  );
  return Number(result.insertId);
}

async function ensureRestaurantCategories() {
  const ids = new Map();
  for (const item of categorySeeds) {
    const [rows] = await pool.execute('SELECT id FROM restaurant_categories WHERE name = ? LIMIT 1', [item.name]);
    if (rows[0]) {
      ids.set(item.name, Number(rows[0].id));
      await pool.execute(
        'UPDATE restaurant_categories SET description = ?, image_url = ?, status = ? WHERE id = ?',
        [item.description, item.imageUrl, 'ACTIVE', rows[0].id]
      );
    } else {
      const [result] = await pool.execute(
        'INSERT INTO restaurant_categories (name, description, image_url, status) VALUES (?, ?, ?, ?)',
        [item.name, item.description, item.imageUrl, 'ACTIVE']
      );
      ids.set(item.name, Number(result.insertId));
    }
  }
  return ids;
}

async function ensureRestaurant(ownerId, categoryIds, seed, index) {
  const [name, description, categoryName, address, ward, district, latitude, longitude] = seed;
  const [rows] = await pool.execute('SELECT id FROM restaurants WHERE name = ? LIMIT 1', [name]);
  const phone = `028${String(39000000 + index).padStart(8, '0')}`;
  const email = `branch${index}@fooddelivery.local`;
  const minimumOrder = 30000 + (index % 4) * 10000;
  const averagePrepareTime = 15 + (index % 5) * 3;
  if (rows[0]) {
    await pool.execute(
      `UPDATE restaurants
       SET owner_user_id = ?, category_id = ?, description = ?, phone = ?, email = ?,
           address = ?, ward = ?, district = ?, city = 'TP.HCM', latitude = ?, longitude = ?,
           opening_time = '07:00:00', closing_time = '22:00:00',
           minimum_order = ?, average_prepare_time = ?, commission_rate = 15,
           rating = IF(rating = 0, 4.60, rating), total_reviews = IF(total_reviews = 0, 36, total_reviews),
           status = 'ACTIVE', deleted_at = NULL
       WHERE id = ?`,
      [
        ownerId,
        categoryIds.get(categoryName) ?? null,
        description,
        phone,
        email,
        address,
        ward,
        district,
        latitude,
        longitude,
        minimumOrder,
        averagePrepareTime,
        rows[0].id
      ]
    );
    return Number(rows[0].id);
  }
  const [result] = await pool.execute(
    `INSERT INTO restaurants
     (owner_user_id, category_id, name, description, phone, email, address, ward, district, city, latitude, longitude, opening_time, closing_time, minimum_order, average_prepare_time, commission_rate, rating, total_reviews, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'TP.HCM', ?, ?, '07:00:00', '22:00:00', ?, ?, 15, 4.60, 36, 'ACTIVE')`,
    [
      ownerId,
      categoryIds.get(categoryName) ?? null,
      name,
      description,
      phone,
      email,
      address,
      ward,
      district,
      latitude,
      longitude,
      minimumOrder,
      averagePrepareTime
    ]
  );
  return Number(result.insertId);
}

async function ensureRestaurantContent(restaurantId, seed, restaurantIndex) {
  const categoryName = seed[2];
  const [menuRows] = await pool.execute('SELECT id FROM menus WHERE restaurant_id = ? AND name = ? LIMIT 1', [restaurantId, 'Thực đơn hôm nay']);
  const menuId = menuRows[0]
    ? Number(menuRows[0].id)
    : Number((await pool.execute(
      `INSERT INTO menus (restaurant_id, name, description, status) VALUES (?, 'Thực đơn hôm nay', 'Các món bán chạy và món mới trong ngày', 'ACTIVE')`,
      [restaurantId]
    ))[0].insertId);

  const menuCategories = getMenuCategoryPlan(categoryName);
  const plannedCategoryNames = new Set(menuCategories.map(item => item.name));
  const staleGenericNames = ['Món bán chạy', 'Món chính', 'Combo tiết kiệm', 'Đồ uống']
    .filter(name => !plannedCategoryNames.has(name));
  if (staleGenericNames.length) {
    const placeholders = staleGenericNames.map(() => '?').join(',');
    await pool.execute(
      `UPDATE menu_categories SET status = 'INACTIVE' WHERE restaurant_id = ? AND name IN (${placeholders})`,
      [restaurantId, ...staleGenericNames]
    );
  }
  const categoryIds = [];
  for (const section of menuCategories) {
    const { name, description } = section;
    const [rows] = await pool.execute('SELECT id FROM menu_categories WHERE restaurant_id = ? AND name = ? LIMIT 1', [restaurantId, name]);
    if (rows[0]) {
      await pool.execute(
        'UPDATE menu_categories SET menu_id = ?, description = ?, sort_order = ?, status = ? WHERE id = ?',
        [menuId, description, categoryIds.length + 1, 'ACTIVE', rows[0].id]
      );
      categoryIds.push(Number(rows[0].id));
    } else {
      const [result] = await pool.execute(
        `INSERT INTO menu_categories (restaurant_id, menu_id, name, description, sort_order, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
        [restaurantId, menuId, name, description, categoryIds.length + 1]
      );
      categoryIds.push(Number(result.insertId));
    }
  }

  const toppingGroupId = await ensureToppings(restaurantId, categoryName);
  const targetCount = 60;
  const [existingRows] = await pool.execute(
    'SELECT id FROM menu_items WHERE restaurant_id = ? AND deleted_at IS NULL ORDER BY id ASC',
    [restaurantId]
  );
  const activeItemIds = existingRows.map(row => Number(row.id));

  for (let itemNumber = 1; itemNumber <= targetCount; itemNumber += 1) {
    const item = buildRestaurantMenuItemSeed({
      seed,
      categoryName,
      restaurantIndex,
      itemNumber,
      categoryIds
    });
    const existingId = activeItemIds[itemNumber - 1];
    if (existingId) {
      await pool.execute(
        `UPDATE menu_items
         SET category_id = ?, name = ?, description = ?, image_url = ?, base_price = ?,
             discount_price = ?, preparation_time = ?, is_available = ?, is_featured = ?, sold_count = ?
         WHERE id = ? AND restaurant_id = ?`,
        [
          item.categoryId,
          item.name,
          item.description,
          item.imageUrl,
          item.basePrice,
          item.discountPrice,
          item.preparationTime,
          item.isAvailable,
          item.isFeatured,
          item.soldCount,
          existingId,
          restaurantId
        ]
      );
    } else {
      await pool.execute(
        `INSERT INTO menu_items
         (restaurant_id, category_id, name, description, image_url, base_price, discount_price,
          preparation_time, is_available, is_featured, sold_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          restaurantId,
          item.categoryId,
          item.name,
          item.description,
          item.imageUrl,
          item.basePrice,
          item.discountPrice,
          item.preparationTime,
          item.isAvailable,
          item.isFeatured,
          item.soldCount
        ]
      );
    }
  }

  if (activeItemIds.length > targetCount) {
    const staleIds = activeItemIds.slice(targetCount);
    const placeholders = staleIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE menu_items SET is_available = FALSE, deleted_at = CURRENT_TIMESTAMP WHERE restaurant_id = ? AND id IN (${placeholders})`,
      [restaurantId, ...staleIds]
    );
  }

  const [items] = await pool.execute('SELECT id FROM menu_items WHERE restaurant_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 60', [restaurantId]);
  for (const item of items) {
    await pool.execute('INSERT IGNORE INTO menu_item_topping_groups (menu_item_id, topping_group_id) VALUES (?, ?)', [item.id, toppingGroupId]);
    await ensureVariants(Number(item.id));
  }
}

function getMenuCategoryPlan(categoryName) {
  const plans = {
    'Cơm': [
      ['Cơm phần đặc trưng', 'Các phần cơm bán chạy, đóng gói đủ rau và nước chấm'],
      ['Món mặn gọi thêm', 'Đồ mặn ăn kèm cơm cho khách muốn gọi riêng'],
      ['Combo văn phòng', 'Set cơm, canh và món phụ cho bữa trưa'],
      ['Canh & món phụ', 'Canh ngày, rau, trứng và món ăn kèm']
    ],
    'Bún - Phở': [
      ['Phở & nước dùng bò/gà', 'Các món phở và nước dùng nấu trong ngày'],
      ['Bún - miến - hủ tiếu', 'Món nước Việt Nam theo từng vùng'],
      ['Topping thêm', 'Thịt, chả, giò, rau và bánh ăn kèm'],
      ['Combo tô lớn', 'Suất no và combo cho nhóm nhỏ']
    ],
    'Đồ ăn nhanh': [
      ['Burger & sandwich', 'Burger, sandwich và hotdog làm nhanh'],
      ['Gà - nuggets - khoai', 'Món chiên giòn và đồ ăn kèm'],
      ['Combo nhanh', 'Combo bữa trưa kèm món phụ'],
      ['Salad & món nhẹ', 'Lựa chọn nhẹ hơn cho khách văn phòng']
    ],
    'Gà rán': [
      ['Gà rán từng phần', 'Cánh, đùi, miếng gà giòn theo phần'],
      ['Gà sốt & gà nướng', 'Gà phủ sốt cay, mật ong, phô mai hoặc BBQ'],
      ['Combo nhóm', 'Set gà cho 2-4 người'],
      ['Món ăn kèm', 'Khoai, salad, sốt và đồ phụ']
    ],
    'Pizza': [
      ['Pizza thủ công', 'Pizza đế mỏng, đế dày và topping nướng lò'],
      ['Mì Ý & pasta', 'Pasta, lasagna và sốt nhà làm'],
      ['Salad & khai vị', 'Salad, bánh mì bơ tỏi và món khai vị'],
      ['Combo pizza', 'Combo pizza, pasta và món ăn kèm']
    ],
    'Trà sữa': [
      ['Trà sữa signature', 'Trà sữa nền trà và topping đặc trưng'],
      ['Trà trái cây', 'Trà trái cây tươi, thanh mát'],
      ['Latte & đá xay', 'Matcha, chocolate, sữa tươi và đá xay'],
      ['Topping thêm', 'Trân châu, thạch, kem cheese và tuỳ chọn đường đá']
    ],
    'Đồ uống': [
      ['Cà phê Việt Nam', 'Cà phê phin, bạc xỉu và cacao'],
      ['Nước ép & sinh tố', 'Nước ép trái cây và sinh tố xay mới'],
      ['Trà thanh mát', 'Trà tắc, trà trái cây và sữa chua'],
      ['Combo đồ uống', 'Combo nước cho nhóm văn phòng']
    ],
    'Đồ ăn vặt': [
      ['Bánh tráng & xiên que', 'Các món ăn vặt cay, giòn, dễ chia sẻ'],
      ['Món hấp - món nóng', 'Há cảo, súp, tokbokki và món nóng'],
      ['Chè & đồ ngọt', 'Chè, bánh và món ngọt sau bữa ăn'],
      ['Combo ăn vặt', 'Set nhiều món cho nhóm bạn']
    ],
    'Đồ chay': [
      ['Cơm - bún chay', 'Món chính thuần chay, no bụng'],
      ['Nấm - đậu hũ - rau củ', 'Món mặn chay từ nấm, đậu và rau củ'],
      ['Gỏi cuốn & món nhẹ', 'Món nhẹ, ít dầu và giàu rau'],
      ['Canh & combo lành mạnh', 'Canh, combo gạo lứt và set cân bằng']
    ],
    'Món Việt': [
      ['Món Việt đặc trưng', 'Món Việt quen thuộc, làm nóng theo đơn'],
      ['Bánh mì - cuốn - nem', 'Bánh mì, gỏi cuốn, nem và món cầm tay'],
      ['Bún - mì - cháo', 'Món nước, cháo và mì vùng miền'],
      ['Combo gia đình', 'Set chia sẻ cho 2-4 người']
    ]
  };

  return (plans[categoryName] ?? plans['Món Việt']).map(([name, description]) => ({ name, description }));
}

function getSignatureStyles(categoryName) {
  const styles = {
    'Trà sữa': ['ít đường', 'trà đậm vị', 'kem cheese', 'trân châu mềm', 'ủ lạnh', 'signature'],
    'Đồ uống': ['rang mộc', 'ít đường', 'ép nguyên chất', 'tươi mát', 'không đá', 'signature'],
    'Pizza': ['nướng lò', 'phô mai kéo sợi', 'sốt nhà làm', 'đế mỏng', 'đế dày', 'kiểu bếp trưởng'],
    'Gà rán': ['giòn rụm', 'sốt cay nhẹ', 'sốt mật ong', 'nướng thơm', 'ít cay', 'chuẩn vị quán'],
    'Đồ ăn nhanh': ['nướng áp chảo', 'phô mai tan chảy', 'giòn nóng', 'sốt đặc biệt', 'ít dầu', 'combo nhanh'],
    'Đồ chay': ['thanh đạm', 'ít dầu', 'sốt nấm', 'gạo lứt', 'rau củ tươi', 'lành mạnh']
  };
  return styles[categoryName] ?? signatureStyles;
}

function getPortionStyles(categoryName) {
  const portions = {
    'Trà sữa': ['size M', 'size L', 'ít đá', 'full topping', 'combo 2 ly', 'chai lớn'],
    'Đồ uống': ['ly vừa', 'ly lớn', 'ít đá', 'chai mang đi', 'combo 2 ly', 'không đường'],
    'Pizza': ['size S', 'size M', 'size L', 'combo 2 người', 'combo gia đình', 'bản đặc biệt'],
    'Gà rán': ['phần 1 người', 'phần 2 miếng', 'phần 4 miếng', 'combo nhóm', 'set gia đình', 'bản đặc biệt']
  };
  return portions[categoryName] ?? portionStyles;
}

function getIngredientAccents(categoryName) {
  const accents = {
    'Trà sữa': ['trân châu đen', 'kem cheese', 'thạch trái cây', 'đường đen', 'sữa tươi', 'matcha Nhật', 'ô long rang', 'đào miếng'],
    'Đồ uống': ['sữa tươi', 'cốt dừa', 'cam tươi', 'ổi hồng', 'bơ sáp', 'mật ong', 'tắc tươi', 'cacao nguyên chất', 'hạt cà phê Arabica'],
    'Pizza': ['phô mai mozzarella', 'sốt cà chua Ý', 'nấm mỡ', 'xúc xích tiêu', 'hải sản tươi', 'bò băm', 'lá oregano', 'dầu olive'],
    'Gà rán': ['bột giòn cay', 'sốt mật ong', 'sốt phô mai', 'sốt BBQ', 'muối ớt xanh', 'lá chanh', 'mè rang', 'khoai ăn kèm'],
    'Đồ ăn nhanh': ['phô mai cheddar', 'bò nướng', 'gà áp chảo', 'xà lách giòn', 'sốt burger', 'khoai chiên', 'bánh mì mềm', 'dưa leo muối'],
    'Cơm': ['gạo tấm mới', 'nước mắm pha tay', 'trứng lòng đào', 'mỡ hành', 'đồ chua giòn', 'sườn ướp mật ong', 'rau luộc', 'canh ngày'],
    'Bún - Phở': ['nước dùng hầm xương', 'rau thơm', 'sa tế nhà làm', 'chả cua', 'giò heo', 'bò tái mềm', 'hành phi', 'chanh ớt'],
    'Đồ ăn vặt': ['muối tắc', 'sốt me', 'phô mai bột', 'mỡ hành', 'tép rang', 'sa tế cay', 'đậu phộng rang', 'nước chấm chua ngọt'],
    'Đồ chay': ['nấm áp chảo', 'đậu hũ non', 'gạo lứt', 'mè rang', 'rau củ hấp', 'sốt nấm', 'rong biển', 'hạt điều rang'],
    'Món Việt': ['nước chấm pha tay', 'rau sống', 'hành phi', 'đồ chua', 'thịt nướng than', 'tôm tươi', 'bánh tráng mềm', 'nước lèo trong']
  };
  return accents[categoryName] ?? ingredientAccents;
}

function buildRestaurantMenuItemSeed({ seed, categoryName, restaurantIndex, itemNumber, categoryIds }) {
  const baseNames = dishCatalog[categoryName] ?? dishCatalog['Món Việt'];
  const baseName = baseNames[(itemNumber - 1) % baseNames.length];
  const district = seed[5] || seed[4] || 'Sài Gòn';
  const brandWord = String(seed[0]).split(' ').filter(Boolean).slice(-2).join(' ');
  const categoryStyles = getSignatureStyles(categoryName);
  const categoryPortions = getPortionStyles(categoryName);
  const categoryAccents = getIngredientAccents(categoryName);
  const style = categoryStyles[(restaurantIndex + itemNumber) % categoryStyles.length];
  const portion = categoryPortions[(restaurantIndex * 2 + itemNumber) % categoryPortions.length];
  const accent = categoryAccents[(restaurantIndex * 7 + itemNumber * 5) % categoryAccents.length];
  const servingMoment = servingMoments[Math.floor((itemNumber - 1) / baseNames.length) % servingMoments.length];
  const sectionIndex = classifyMenuSection(categoryName, baseName, itemNumber, categoryIds.length);
  const price = buildRealisticPrice(categoryName, restaurantIndex, itemNumber, sectionIndex);
  const discount = itemNumber % 11 === 0 ? Math.max(1000, price - 6000 - (restaurantIndex % 4) * 1000) : null;

  return {
    categoryId: categoryIds[sectionIndex] ?? categoryIds[0] ?? null,
    name: `${baseName} ${style} ${accent} ${portion} bản ${servingMoment}`,
    description: `${baseName} phiên bản ${style.toLowerCase()} với ${accent.toLowerCase()}, phù hợp ${servingMoment}; phục vụ tại ${district} và được định giá riêng cho quán ${brandWord}.`,
    imageUrl: `/uploads/menu-items/restaurant-${restaurantIndex}-${itemNumber}.jpg`,
    basePrice: price,
    discountPrice: discount,
    preparationTime: 8 + ((restaurantIndex + itemNumber + sectionIndex) % 24),
    isAvailable: itemNumber % 29 !== 0,
    isFeatured: itemNumber % 9 === 0 || itemNumber <= 4,
    soldCount: 12 + ((restaurantIndex * 37 + itemNumber * 19 + sectionIndex * 11) % 480)
  };
}

function classifyMenuSection(categoryName, baseName, itemNumber, sectionCount) {
  const lower = baseName.toLowerCase();
  let index = 0;
  if (categoryName === 'Pizza') {
    if (lower.includes('mì') || lower.includes('lasagna')) index = 1;
    else if (lower.includes('salad')) index = 2;
    else if (itemNumber % 7 === 0) index = 3;
  } else if (categoryName === 'Đồ uống') {
    if (lower.includes('nước') || lower.includes('sinh tố') || lower.includes('sữa chua')) index = 1;
    else if (lower.includes('trà')) index = 2;
    else if (itemNumber % 8 === 0) index = 3;
  } else if (categoryName === 'Trà sữa') {
    if (lower.includes('trà ') && !lower.includes('sữa')) index = 1;
    else if (lower.includes('latte') || lower.includes('đá xay') || lower.includes('sữa tươi')) index = 2;
    else if (itemNumber % 6 === 0) index = 3;
  } else if (categoryName === 'Cơm') {
    if (itemNumber % 6 === 0) index = 2;
    else if (lower.includes('kho') || lower.includes('trứng') || itemNumber % 5 === 0) index = 1;
    else if (itemNumber % 13 === 0) index = 3;
  } else if (categoryName === 'Bún - Phở') {
    if (lower.includes('phở')) index = 0;
    else if (itemNumber % 7 === 0) index = 3;
    else if (lower.includes('thịt') || lower.includes('cua') || itemNumber % 5 === 0) index = 2;
    else index = 1;
  } else if (categoryName === 'Gà rán') {
    if (lower.includes('combo')) index = 2;
    else if (lower.includes('sốt') || lower.includes('nướng')) index = 1;
    else if (itemNumber % 8 === 0) index = 3;
  } else if (categoryName === 'Đồ ăn nhanh') {
    if (lower.includes('burger') || lower.includes('sandwich') || lower.includes('hotdog')) index = 0;
    else if (lower.includes('khoai') || lower.includes('nuggets')) index = 1;
    else if (lower.includes('combo') || itemNumber % 6 === 0) index = 2;
    else index = 3;
  } else if (categoryName === 'Đồ ăn vặt') {
    if (lower.includes('chè')) index = 2;
    else if (lower.includes('há cảo') || lower.includes('tokbokki') || lower.includes('súp')) index = 1;
    else if (itemNumber % 6 === 0) index = 3;
  } else if (categoryName === 'Đồ chay') {
    if (lower.includes('nấm') || lower.includes('đậu') || lower.includes('rau')) index = 1;
    else if (lower.includes('gỏi')) index = 2;
    else if (lower.includes('canh') || itemNumber % 7 === 0) index = 3;
  } else if (categoryName === 'Món Việt') {
    if (lower.includes('bánh mì') || lower.includes('cuốn') || lower.includes('nem')) index = 1;
    else if (lower.includes('bún') || lower.includes('mì') || lower.includes('cháo')) index = 2;
    else if (itemNumber % 6 === 0) index = 3;
  }
  return Math.min(index, Math.max(0, sectionCount - 1));
}

function buildRealisticPrice(categoryName, restaurantIndex, itemNumber, sectionIndex) {
  const baseByCategory = {
    'Cơm': 42000,
    'Bún - Phở': 45000,
    'Đồ ăn nhanh': 39000,
    'Gà rán': 49000,
    'Pizza': 69000,
    'Trà sữa': 29000,
    'Đồ uống': 26000,
    'Đồ ăn vặt': 25000,
    'Đồ chay': 38000,
    'Món Việt': 36000
  };
  const base = baseByCategory[categoryName] ?? 36000;
  return base + sectionIndex * 6000 + ((restaurantIndex * 3 + itemNumber) % 9) * 3000;
}

async function ensureToppings(restaurantId, categoryName) {
  const groupName = ['Trà sữa', 'Đồ uống'].includes(categoryName) ? 'Topping đồ uống' : 'Tùy chọn thêm';
  const [groupRows] = await pool.execute('SELECT id FROM topping_groups WHERE restaurant_id = ? AND name = ? LIMIT 1', [restaurantId, groupName]);
  const groupId = groupRows[0]
    ? Number(groupRows[0].id)
    : Number((await pool.execute(
      `INSERT INTO topping_groups (restaurant_id, name, min_select, max_select, required)
       VALUES (?, ?, 0, 3, FALSE)`,
      [restaurantId, groupName]
    ))[0].insertId);
  const toppingNames = ['Trà sữa', 'Đồ uống'].includes(categoryName)
    ? [['Trân châu đen', 7000], ['Kem cheese', 10000], ['Thạch trái cây', 8000], ['Ít đá', 0]]
    : [['Thêm trứng', 7000], ['Thêm rau', 5000], ['Thêm sốt', 4000], ['Suất lớn', 12000]];
  for (const [name, price] of toppingNames) {
    const [rows] = await pool.execute('SELECT id FROM toppings WHERE group_id = ? AND name = ? LIMIT 1', [groupId, name]);
    if (!rows[0]) await pool.execute('INSERT INTO toppings (group_id, name, price, status) VALUES (?, ?, ?, ?)', [groupId, name, price, 'ACTIVE']);
  }
  return groupId;
}

async function ensureVariants(menuItemId) {
  const variants = [['Vừa', 0], ['Lớn', 10000]];
  for (const [name, priceAdjustment] of variants) {
    const [rows] = await pool.execute('SELECT id FROM menu_item_variants WHERE menu_item_id = ? AND name = ? LIMIT 1', [menuItemId, name]);
    if (!rows[0]) await pool.execute('INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment, status) VALUES (?, ?, ?, ?)', [menuItemId, name, priceAdjustment, 'ACTIVE']);
  }
}

async function ensureBanners() {
  const banners = [
    ['Bữa trưa văn phòng giảm đến 40K', '/uploads/banners/lunch-office.jpg', '/restaurants?keyword=com', 1],
    ['Trà sữa chiều nay, freeship khu trung tâm', '/uploads/banners/milk-tea.jpg', '/restaurants?keyword=tra-sua', 2],
    ['Món Việt nóng hổi giao trong 30 phút', '/uploads/banners/vietnamese-food.jpg', '/restaurants?keyword=mon-viet', 3]
  ];
  for (const [title, imageUrl, targetUrl, sortOrder] of banners) {
    const [rows] = await pool.execute('SELECT id FROM banners WHERE title = ? LIMIT 1', [title]);
    if (!rows[0]) {
      await pool.execute(
        `INSERT INTO banners (title, image_url, target_url, start_at, end_at, sort_order, status)
         VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), ?, 'ACTIVE')`,
        [title, imageUrl, targetUrl, sortOrder]
      );
    }
  }
}

async function ensurePromotions(restaurantIds) {
  const promotions = [
    [null, 'FREESHIP25', 'Miễn phí giao hàng khu trung tâm', 'FREE_DELIVERY', 25000, 25000, 50000],
    [restaurantIds[0], 'COMTRUA40', 'Giảm 40K cho cơm trưa', 'FIXED_AMOUNT', 40000, 40000, 120000],
    [restaurantIds[5], 'TRASUA20', 'Giảm 20% trà sữa chiều', 'PERCENT', 20, 30000, 70000]
  ];
  for (const [restaurantId, code, name, type, value, maxDiscount, minimumOrder] of promotions) {
    const [rows] = await pool.execute('SELECT id FROM promotions WHERE code = ? LIMIT 1', [code]);
    if (!rows[0]) {
      await pool.execute(
        `INSERT INTO promotions
         (restaurant_id, code, name, description, discount_type, discount_value, max_discount, minimum_order, start_at, end_at, usage_limit, usage_per_customer, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), 500, 2, 'ACTIVE')`,
        [restaurantId, code, name, `${name} áp dụng cho dữ liệu vận hành mẫu`, type, value, maxDiscount, minimumOrder]
      );
    }
  }
}

async function ensureDeliveredReviewOrders(customerProfileId, customerAddressId, shipperProfileId, restaurantIds) {
  const [addressRows] = await pool.execute(
    `SELECT receiver_name, receiver_phone, address_line, ward, district, city, latitude, longitude
     FROM customer_addresses WHERE id = ? LIMIT 1`,
    [customerAddressId]
  );
  const address = addressRows[0];
  if (!address) return;

  const reviewComments = [
    'Món giao còn nóng, đóng gói chắc chắn và vị rất ổn.',
    'Giá hơi cao hơn quán khác nhưng khẩu phần đầy đặn, đáng tiền.',
    'Món đúng mô tả, chuẩn bị nhanh, lần sau sẽ đặt tiếp.',
    'Nêm nếm vừa miệng, topping khác biệt so với các quán cùng món.',
    'Quán xử lý đơn nhanh, hình ảnh và món nhận được khá khớp.'
  ];

  for (let index = 0; index < Math.min(12, restaurantIds.length); index += 1) {
    const restaurantId = restaurantIds[index];
    const code = `SEED-RVW-${String(index + 1).padStart(3, '0')}`;
    const [itemRows] = await pool.execute(
      `SELECT id, name, COALESCE(discount_price, base_price) AS price
       FROM menu_items
       WHERE restaurant_id = ? AND deleted_at IS NULL AND is_available = TRUE
       ORDER BY is_featured DESC, sold_count DESC, id ASC
       LIMIT 2`,
      [restaurantId]
    );
    if (!itemRows.length) continue;

    const subtotal = itemRows.reduce((sum, item, itemIndex) => sum + Number(item.price) * (itemIndex + 1), 0);
    const deliveryFee = 12000 + (index % 3) * 3000;
    const total = subtotal + deliveryFee;
    const fullAddress = `${address.address_line}, ${address.ward}, ${address.district}, ${address.city}`;
    const [orderRows] = await pool.execute('SELECT id FROM orders WHERE order_code = ? LIMIT 1', [code]);
    let orderId;
    let shouldInsertOrderItems = false;
    if (orderRows[0]) {
      orderId = Number(orderRows[0].id);
      await pool.execute(
        `UPDATE orders
         SET customer_id = ?, restaurant_id = ?, shipper_id = ?, delivery_address_id = ?,
             receiver_name = ?, receiver_phone = ?, delivery_address = ?, delivery_latitude = ?,
             delivery_longitude = ?, subtotal = ?, delivery_fee = ?, total_amount = ?,
             payment_method = 'COD', payment_status = 'PAID', order_status = 'DELIVERED',
             delivered_at = COALESCE(delivered_at, DATE_SUB(NOW(), INTERVAL ? DAY))
         WHERE id = ?`,
        [
          customerProfileId,
          restaurantId,
          shipperProfileId,
          customerAddressId,
          address.receiver_name,
          address.receiver_phone,
          fullAddress,
          address.latitude,
          address.longitude,
          subtotal,
          deliveryFee,
          total,
          index + 2,
          orderId
        ]
      );
    } else {
      const [result] = await pool.execute(
        `INSERT INTO orders
         (order_code, idempotency_key, customer_id, restaurant_id, shipper_id, delivery_address_id,
          receiver_name, receiver_phone, delivery_address, delivery_latitude, delivery_longitude,
          subtotal, delivery_fee, total_amount, payment_method, payment_status, order_status,
          customer_note, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COD', 'PAID', 'DELIVERED', ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [
          code,
          `seed-review-${index + 1}`,
          customerProfileId,
          restaurantId,
          shipperProfileId,
          customerAddressId,
          address.receiver_name,
          address.receiver_phone,
          fullAddress,
          address.latitude,
          address.longitude,
          subtotal,
          deliveryFee,
          total,
          'Đơn mẫu đã giao để kiểm thử đánh giá quán',
          index + 2
        ]
      );
      orderId = Number(result.insertId);
      shouldInsertOrderItems = true;
    }

    if (!shouldInsertOrderItems) {
      const itemCount = await scalar('SELECT COUNT(*) AS total FROM order_items WHERE order_id = ?', [orderId]);
      shouldInsertOrderItems = itemCount === 0;
    }
    if (shouldInsertOrderItems) {
      for (let itemIndex = 0; itemIndex < itemRows.length; itemIndex += 1) {
        const quantity = itemIndex + 1;
        const price = Number(itemRows[itemIndex].price);
        await pool.execute(
          `INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, total_price, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, itemRows[itemIndex].id, itemRows[itemIndex].name, quantity, price, price * quantity, 'Seed review order']
        );
      }
    }
    await pool.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
       SELECT ?, NULL, 'DELIVERED', NULL, 'Seed delivered review order'
       WHERE NOT EXISTS (
         SELECT 1 FROM order_status_history WHERE order_id = ? AND new_status = 'DELIVERED' LIMIT 1
       )`,
      [orderId, orderId]
    );
    await pool.execute(
      `INSERT INTO restaurant_reviews (order_id, customer_id, restaurant_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), deleted_at = NULL`,
      [orderId, customerProfileId, restaurantId, 5 - (index % 3 === 0 ? 1 : 0), reviewComments[index % reviewComments.length]]
    );
  }
}

async function ensureFavorites(customerProfileId, restaurantIds) {
  for (const restaurantId of restaurantIds.slice(0, 3)) {
    await pool.execute('INSERT IGNORE INTO favorite_restaurants (customer_id, restaurant_id) VALUES (?, ?)', [customerProfileId, restaurantId]);
  }
  const [items] = await pool.execute('SELECT id FROM menu_items WHERE restaurant_id IN (?, ?, ?) AND deleted_at IS NULL LIMIT 6', restaurantIds.slice(0, 3));
  for (const item of items) {
    await pool.execute('INSERT IGNORE INTO favorite_menu_items (customer_id, menu_item_id) VALUES (?, ?)', [customerProfileId, item.id]);
  }
}

async function ensureSearchHistory(customerProfileId) {
  for (const keyword of ['cơm trưa', 'trà sữa', 'bún bò', 'gà rán']) {
    const [rows] = await pool.execute(
      'SELECT id FROM search_history WHERE customer_id = ? AND keyword = ? LIMIT 1',
      [customerProfileId, keyword]
    );
    if (!rows[0]) await pool.execute('INSERT INTO search_history (customer_id, keyword) VALUES (?, ?)', [customerProfileId, keyword]);
  }
}

async function ensureWallet(userId) {
  const [rows] = await pool.execute('SELECT id FROM wallets WHERE user_id = ? LIMIT 1', [userId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await pool.execute('INSERT INTO wallets (user_id, balance, status) VALUES (?, 250000, ?)', [userId, 'ACTIVE']);
  await pool.execute(
    `INSERT INTO wallet_transactions (wallet_id, type, amount, reference_type, reference_id, balance_before, balance_after, description)
     VALUES (?, 'DEPOSIT', 250000, 'MANUAL', NULL, 0, 250000, 'Số dư khởi tạo cho tài khoản khách hàng')`,
    [result.insertId]
  );
  return Number(result.insertId);
}

async function ensureNotificationPreferences(userIds) {
  for (const userId of userIds) {
    await pool.execute(
      `INSERT IGNORE INTO notification_preferences
       (user_id, email_enabled, push_enabled, order_updates, promotion_updates, system_updates)
       VALUES (?, TRUE, TRUE, TRUE, TRUE, TRUE)`,
      [userId]
    );
  }
}

async function ensureSupportTicket(customerUserId, adminUserId) {
  const code = 'SP-REAL-DATA-001';
  const [rows] = await pool.execute('SELECT id FROM support_tickets WHERE ticket_code = ? LIMIT 1', [code]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await pool.execute(
    `INSERT INTO support_tickets (ticket_code, user_id, subject, description, category, priority, status, assigned_admin_id)
     VALUES (?, ?, 'Cần hỗ trợ kiểm tra phí giao hàng', 'Khách muốn xác nhận phí giao hàng trước khi đặt món.', 'DELIVERY', 'MEDIUM', 'IN_PROGRESS', ?)`,
    [code, customerUserId, adminUserId]
  );
  await pool.execute(
    `INSERT INTO support_messages (ticket_id, sender_id, message)
     VALUES (?, ?, 'Tôi muốn kiểm tra phí giao hàng cho địa chỉ Quận 1.'), (?, ?, 'Bộ phận hỗ trợ đã tiếp nhận và đang kiểm tra.')`,
    [result.insertId, customerUserId, result.insertId, adminUserId]
  );
  return Number(result.insertId);
}

async function ensureNotifications({ adminId, restaurantOwnerId, customerId, shipperId }) {
  const items = [
    [adminId, 'Dữ liệu vận hành đã sẵn sàng', 'Bộ dữ liệu seed thực tế đã được nạp vào hệ thống.', 'SYSTEM'],
    [restaurantOwnerId, 'Nhà hàng đã có thực đơn', '20 chi nhánh và thực đơn mẫu đã sẵn sàng nhận đơn.', 'SYSTEM'],
    [customerId, 'Ưu đãi mới cho bữa trưa', 'Dùng mã COMTRUA40 cho đơn cơm trưa đủ điều kiện.', 'PROMOTION'],
    [shipperId, 'Hồ sơ tài xế đã xác minh', 'Bạn có thể bật trạng thái sẵn sàng để nhận đơn.', 'SYSTEM']
  ];
  for (const [userId, title, message, type] of items) {
    const [rows] = await pool.execute('SELECT id FROM notifications WHERE user_id = ? AND title = ? LIMIT 1', [userId, title]);
    if (!rows[0]) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, reference_type) VALUES (?, ?, ?, ?, ?)',
        [userId, title, message, type, 'SEED']
      );
    }
  }
}

async function scalar(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return Number(rows[0]?.total ?? 0);
}
