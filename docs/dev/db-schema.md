# Database schema

> Sinh tự động bởi `tools/generate-dev-docs.mjs` lúc 2026-11-08T03:43:18.678Z từ DB `food_delivery_db`. **Đừng sửa tay** — chạy lại script sau khi đổi schema.

- 71 bảng, 20 trigger, 115 khoá ngoại. Nguồn sự thật của schema: `food_delivery_db.sql` (gốc) + `food-delivery-platform/backend/database/migrations/*.sql` (áp theo thứ tự tên file).
- Kiểu tiền: `DECIMAL(15,2)` (VND). Thời gian: `DATETIME` naive theo giờ địa phương (UTC+7), mysql2 trả `Date`. Xoá mềm bằng cột `deleted_at`.
- Số bản ghi hiện tại ở cột "Dòng" (đếm thật, không phải ước lượng).

## Mục lục theo miền

- **Tài khoản, phân quyền, bảo mật**: [users](#users), [roles](#roles), [permissions](#permissions), [role_permissions](#role_permissions), [refresh_tokens](#refresh_tokens), [password_reset_tokens](#password_reset_tokens), [email_verification_tokens](#email_verification_tokens), [login_history](#login_history), [audit_logs](#audit_logs), [partner_applications](#partner_applications), [system_settings](#system_settings)
- **Khách hàng, địa chỉ**: [customer_profiles](#customer_profiles), [customer_addresses](#customer_addresses), [favorite_restaurants](#favorite_restaurants), [favorite_menu_items](#favorite_menu_items), [search_history](#search_history)
- **Nhà hàng, thực đơn, combo**: [restaurant_categories](#restaurant_categories), [restaurants](#restaurants), [restaurant_images](#restaurant_images), [restaurant_operating_hours](#restaurant_operating_hours), [menus](#menus), [menu_categories](#menu_categories), [menu_items](#menu_items), [menu_item_variants](#menu_item_variants), [topping_groups](#topping_groups), [toppings](#toppings), [menu_item_topping_groups](#menu_item_topping_groups), [menu_item_combo_components](#menu_item_combo_components), [delivery_zones](#delivery_zones)
- **Giỏ hàng, đơn hàng**: [carts](#carts), [cart_items](#cart_items), [cart_item_toppings](#cart_item_toppings), [orders](#orders), [order_items](#order_items), [order_item_toppings](#order_item_toppings), [order_status_history](#order_status_history), [order_cancellations](#order_cancellations)
- **Tài xế, giao hàng**: [shipper_profiles](#shipper_profiles), [shipper_documents](#shipper_documents), [delivery_assignments](#delivery_assignments), [deliveries](#deliveries), [delivery_status_history](#delivery_status_history), [shipper_locations](#shipper_locations), [shipper_earnings](#shipper_earnings), [shipper_withdrawals](#shipper_withdrawals)
- **Thanh toán, tài chính**: [payments](#payments), [payment_transactions](#payment_transactions), [cod_transactions](#cod_transactions), [refunds](#refunds), [invoices](#invoices), [wallets](#wallets), [wallet_transactions](#wallet_transactions), [restaurant_commissions](#restaurant_commissions), [restaurant_settlements](#restaurant_settlements)
- **Khuyến mãi, điểm thưởng**: [promotions](#promotions), [promotion_usage](#promotion_usage), [loyalty_rewards](#loyalty_rewards), [loyalty_transactions](#loyalty_transactions), [banners](#banners)
- **Đánh giá, hỗ trợ, giao tiếp**: [restaurant_reviews](#restaurant_reviews), [shipper_reviews](#shipper_reviews), [menu_item_reviews](#menu_item_reviews), [support_tickets](#support_tickets), [support_messages](#support_messages), [chat_sessions](#chat_sessions), [chat_messages](#chat_messages), [notifications](#notifications), [notification_preferences](#notification_preferences)
- **Job nền, nhập/xuất**: [export_jobs](#export_jobs), [import_jobs](#import_jobs), [background_jobs](#background_jobs)

## Tài khoản, phân quyền, bảo mật

### users

*154 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| role_id | bigint unsigned |  |  | FK → roles.id (RESTRICT) |
| username | varchar(100) |  |  | UNIQUE |
| email | varchar(150) |  |  | UNIQUE |
| phone | varchar(20) | ✓ |  | UNIQUE |
| password_hash | varchar(255) |  |  |  |
| avatar_url | varchar(500) | ✓ |  |  |
| status | enum('ACTIVE','INACTIVE','LOCKED','PENDING') |  | PENDING |  |
| email_verified_at | datetime | ✓ |  |  |
| phone_verified_at | datetime | ✓ |  |  |
| last_login_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `email`(email) UNIQUE, `idx_users_deleted`(deleted_at), `idx_users_role`(role_id), `idx_users_status`(status), `phone`(phone) UNIQUE, `username`(username) UNIQUE

### roles

*4 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| name | varchar(50) |  |  | UNIQUE |
| description | varchar(255) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `name`(name) UNIQUE

### permissions

*30 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| name | varchar(100) |  |  |  |
| code | varchar(100) |  |  | UNIQUE |
| description | varchar(255) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `code`(code) UNIQUE

### role_permissions

*64 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| role_id | bigint unsigned |  |  | PK; FK → roles.id (CASCADE) |
| permission_id | bigint unsigned |  |  | PK; FK → permissions.id (CASCADE) |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_role_permissions_permission`(permission_id)

### refresh_tokens

*2,523 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | FK → users.id (CASCADE) |
| token_hash | varchar(500) |  |  | UNIQUE |
| expires_at | datetime |  |  |  |
| revoked_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_refresh_token_user`(user_id), `token_hash`(token_hash) UNIQUE

### password_reset_tokens

*0 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | FK → users.id (CASCADE) |
| token_hash | varchar(500) |  |  | UNIQUE |
| expires_at | datetime |  |  |  |
| used_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_password_token_user`(user_id), `token_hash`(token_hash) UNIQUE

### email_verification_tokens

*0 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | FK → users.id (CASCADE) |
| token_hash | varchar(500) |  |  | UNIQUE |
| expires_at | datetime |  |  |  |
| verified_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_verification_token_user`(user_id), `token_hash`(token_hash) UNIQUE

### login_history

*2,434 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| email_attempted | varchar(150) | ✓ |  |  |
| ip_address | varchar(45) | ✓ |  |  |
| user_agent | varchar(1000) | ✓ |  |  |
| success | tinyint(1) |  | 0 |  |
| logged_in_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `idx_login_date`(logged_in_at), `idx_login_user`(user_id)

### audit_logs

*576,015 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| action | varchar(100) |  |  |  |
| entity_type | varchar(100) |  |  |  |
| entity_id | bigint unsigned | ✓ |  |  |
| old_values | json | ✓ |  |  |
| new_values | json | ✓ |  |  |
| ip_address | varchar(45) | ✓ |  |  |
| user_agent | varchar(1000) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `idx_audit_created`(created_at), `idx_audit_entity`(entity_type,entity_id), `idx_audit_user`(user_id)

### partner_applications

*9 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| application_type | enum('SHIPPER','RESTAURANT') |  |  |  |
| user_id | bigint unsigned |  |  | FK → users.id (CASCADE) |
| entity_id | bigint unsigned | ✓ |  |  |
| applicant_name | varchar(150) |  |  |  |
| payload | json | ✓ |  |  |
| status | enum('PENDING','APPROVED','REJECTED') |  | PENDING |  |
| review_note | varchar(500) | ✓ |  |  |
| reviewed_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| reviewed_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_partner_app_reviewer`(reviewed_by), `fk_partner_app_user`(user_id), `idx_partner_app_status`(status,application_type)

### system_settings

*12 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| setting_key | varchar(150) |  |  | UNIQUE |
| setting_value | text | ✓ |  |  |
| data_type | enum('STRING','INTEGER','DECIMAL','BOOLEAN','JSON') |  | STRING |  |
| description | varchar(500) | ✓ |  |  |
| updated_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_setting_user`(updated_by), `setting_key`(setting_key) UNIQUE

## Khách hàng, địa chỉ

### customer_profiles

*117 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | UNIQUE; FK → users.id (CASCADE) |
| full_name | varchar(150) |  |  |  |
| date_of_birth | date | ✓ |  |  |
| gender | enum('MALE','FEMALE','OTHER') | ✓ |  |  |
| loyalty_points | int unsigned |  | 0 |  |
| total_orders | int unsigned |  | 0 |  |
| total_spent | decimal(18,2) |  | 0.00 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `idx_customer_name`(full_name), `user_id`(user_id) UNIQUE

CHECK: `(`loyalty_points` >= 0)`; `(`total_spent` >= 0)`

### customer_addresses

*139 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (CASCADE) |
| label | varchar(50) | ✓ |  |  |
| receiver_name | varchar(150) |  |  |  |
| receiver_phone | varchar(20) |  |  |  |
| address_line | varchar(255) |  |  |  |
| ward | varchar(100) | ✓ |  |  |
| district | varchar(100) | ✓ |  |  |
| city | varchar(100) |  |  |  |
| latitude | decimal(10,7) | ✓ |  |  |
| longitude | decimal(10,7) | ✓ |  |  |
| is_default | tinyint(1) |  | 0 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `idx_address_city_district`(city,district), `idx_address_customer`(customer_id)

### favorite_restaurants

*250 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| customer_id | bigint unsigned |  |  | PK; FK → customer_profiles.id (CASCADE) |
| restaurant_id | bigint unsigned |  |  | PK; FK → restaurants.id (CASCADE) |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_favorite_restaurant`(restaurant_id)

### favorite_menu_items

*364 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| customer_id | bigint unsigned |  |  | PK; FK → customer_profiles.id (CASCADE) |
| menu_item_id | bigint unsigned |  |  | PK; FK → menu_items.id (CASCADE) |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_favorite_menu_item`(menu_item_id)

### search_history

*16 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (CASCADE) |
| keyword | varchar(255) |  |  |  |
| searched_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `idx_search_customer`(customer_id,searched_at)

## Nhà hàng, thực đơn, combo

### restaurant_categories

*15 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| name | varchar(100) |  |  | UNIQUE |
| description | varchar(500) | ✓ |  |  |
| image_url | varchar(500) | ✓ |  |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `name`(name) UNIQUE

### restaurants

*20 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| owner_user_id | bigint unsigned |  |  | FK → users.id (RESTRICT) |
| category_id | bigint unsigned | ✓ |  | FK → restaurant_categories.id (SET NULL) |
| name | varchar(200) |  |  |  |
| description | text | ✓ |  |  |
| phone | varchar(20) | ✓ |  |  |
| email | varchar(150) | ✓ |  |  |
| address | varchar(255) |  |  |  |
| ward | varchar(100) | ✓ |  |  |
| district | varchar(100) | ✓ |  |  |
| city | varchar(100) |  |  |  |
| latitude | decimal(10,7) | ✓ |  |  |
| longitude | decimal(10,7) | ✓ |  |  |
| opening_time | time | ✓ |  |  |
| closing_time | time | ✓ |  |  |
| minimum_order | decimal(15,2) |  | 0.00 |  |
| average_prepare_time | int unsigned |  | 20 |  |
| rating | decimal(3,2) |  | 0.00 |  |
| total_reviews | int unsigned |  | 0 |  |
| total_orders | int unsigned |  | 0 |  |
| total_revenue | decimal(18,2) |  | 0.00 |  |
| commission_rate | decimal(5,2) |  | 0.00 |  |
| status | enum('PENDING','ACTIVE','INACTIVE','SUSPENDED') |  | PENDING |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `idx_restaurant_category`(category_id), `idx_restaurant_location`(city,district), `idx_restaurant_name`(name), `idx_restaurant_owner`(owner_user_id), `idx_restaurant_rating`(rating), `idx_restaurant_status`(status)

CHECK: `(`commission_rate` between 0 and 100)`; `(`minimum_order` >= 0)`; `(`rating` between 0 and 5)`

### restaurant_images

*0 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| image_url | varchar(500) |  |  |  |
| image_type | enum('LOGO','COVER','GALLERY') |  | GALLERY |  |
| sort_order | int |  | 0 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_restaurant_image`(restaurant_id)

### restaurant_operating_hours

*7 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| day_of_week | tinyint unsigned |  |  |  |
| open_time | time | ✓ |  |  |
| close_time | time | ✓ |  |  |
| is_closed | tinyint(1) |  | 0 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `uk_restaurant_day`(restaurant_id,day_of_week) UNIQUE

CHECK: `(`day_of_week` between 1 and 7)`

### menus

*20 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| name | varchar(150) |  |  |  |
| description | varchar(500) | ✓ |  |  |
| start_time | time | ✓ |  |  |
| end_time | time | ✓ |  |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `idx_menu_restaurant`(restaurant_id)

### menu_categories

*81 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| menu_id | bigint unsigned | ✓ |  | FK → menus.id (CASCADE) |
| name | varchar(150) |  |  |  |
| description | varchar(500) | ✓ |  |  |
| sort_order | int |  | 0 |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_menu_category_menu`(menu_id), `idx_menu_category_restaurant`(restaurant_id)

### menu_items

*466 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| category_id | bigint unsigned | ✓ |  | FK → menu_categories.id (SET NULL) |
| name | varchar(200) |  |  |  |
| description | text | ✓ |  |  |
| item_type | enum('DISH','COMBO') |  | DISH |  |
| image_url | varchar(500) | ✓ |  |  |
| base_price | decimal(15,2) |  |  |  |
| discount_price | decimal(15,2) | ✓ |  |  |
| preparation_time | int unsigned | ✓ | 15 |  |
| is_available | tinyint(1) |  | 1 |  |
| is_featured | tinyint(1) |  | 0 |  |
| sold_count | int unsigned |  | 0 |  |
| rating | decimal(3,2) |  | 0.00 |  |
| total_reviews | int unsigned |  | 0 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `idx_menu_item_available`(is_available), `idx_menu_item_category`(category_id), `idx_menu_item_featured`(is_featured), `idx_menu_item_name`(name), `idx_menu_item_restaurant`(restaurant_id)

CHECK: `(`base_price` >= 0)`; `((`discount_price` is null) or (`discount_price` >= 0))`

### menu_item_variants

*281 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| menu_item_id | bigint unsigned |  |  | FK → menu_items.id (CASCADE) |
| name | varchar(100) |  |  |  |
| price_adjustment | decimal(15,2) |  | 0.00 |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_variant_item`(menu_item_id)

### topping_groups

*41 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| name | varchar(150) |  |  |  |
| min_select | int unsigned |  | 0 |  |
| max_select | int unsigned |  | 1 |  |
| required | tinyint(1) |  | 0 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_topping_group_restaurant`(restaurant_id)

CHECK: `(`max_select` >= `min_select`)`

### toppings

*145 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| group_id | bigint unsigned |  |  | FK → topping_groups.id (CASCADE) |
| name | varchar(150) |  |  |  |
| price | decimal(15,2) |  | 0.00 |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_topping_group`(group_id)

CHECK: `(`price` >= 0)`

### menu_item_topping_groups

*658 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| menu_item_id | bigint unsigned |  |  | PK; FK → menu_items.id (CASCADE) |
| topping_group_id | bigint unsigned |  |  | PK; FK → topping_groups.id (CASCADE) |

Chỉ mục: `fk_mitg_group`(topping_group_id)

### menu_item_combo_components

*160 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| combo_item_id | bigint unsigned |  |  | PK; FK → menu_items.id (CASCADE) |
| component_item_id | bigint unsigned |  |  | PK; FK → menu_items.id (CASCADE) |
| quantity | int unsigned |  | 1 |  |

Chỉ mục: `fk_combo_component`(component_item_id)

CHECK: `(`quantity` between 1 and 20)`

### delivery_zones

*13 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| name | varchar(150) |  |  |  |
| city | varchar(100) |  |  |  |
| district | varchar(100) | ✓ |  |  |
| base_fee | decimal(15,2) |  | 0.00 |  |
| price_per_km | decimal(15,2) |  | 0.00 |  |
| minimum_fee | decimal(15,2) |  | 0.00 |  |
| maximum_distance | decimal(10,2) |  | 20.00 |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

CHECK: `(`base_fee` >= 0)`; `(`maximum_distance` > 0)`; `(`price_per_km` >= 0)`

## Giỏ hàng, đơn hàng

### carts

*1 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (CASCADE) |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_cart_restaurant`(restaurant_id), `idx_cart_customer`(customer_id), `uk_customer_restaurant_cart`(customer_id,restaurant_id) UNIQUE

### cart_items

*1 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| cart_id | bigint unsigned |  |  | FK → carts.id (CASCADE) |
| menu_item_id | bigint unsigned |  |  | FK → menu_items.id (CASCADE) |
| variant_id | bigint unsigned | ✓ |  | FK → menu_item_variants.id (SET NULL) |
| quantity | int unsigned |  | 1 |  |
| unit_price | decimal(15,2) |  |  |  |
| note | varchar(500) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_cart_item_menu`(menu_item_id), `fk_cart_item_variant`(variant_id), `idx_cart_item_cart`(cart_id)

CHECK: `(`unit_price` >= 0)`; `(`quantity` > 0)`

### cart_item_toppings

*0 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| cart_item_id | bigint unsigned |  |  | PK; FK → cart_items.id (CASCADE) |
| topping_id | bigint unsigned |  |  | PK; FK → toppings.id (CASCADE) |
| price | decimal(15,2) |  | 0.00 |  |
| quantity | int unsigned |  | 1 |  |

Chỉ mục: `fk_cart_topping`(topping_id)

CHECK: `(`price` >= 0)`; `(`quantity` > 0)`

### orders

*18,125 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_code | varchar(50) |  |  | UNIQUE |
| idempotency_key | varchar(100) | ✓ |  |  |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (RESTRICT) |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (RESTRICT) |
| shipper_id | bigint unsigned | ✓ |  | FK → shipper_profiles.id (SET NULL) |
| delivery_address_id | bigint unsigned | ✓ |  | FK → customer_addresses.id (SET NULL) |
| receiver_name | varchar(150) |  |  |  |
| receiver_phone | varchar(20) |  |  |  |
| delivery_address | varchar(500) |  |  |  |
| delivery_latitude | decimal(10,7) | ✓ |  |  |
| delivery_longitude | decimal(10,7) | ✓ |  |  |
| subtotal | decimal(15,2) |  | 0.00 |  |
| discount_amount | decimal(15,2) |  | 0.00 |  |
| delivery_fee | decimal(15,2) |  | 0.00 |  |
| service_fee | decimal(15,2) |  | 0.00 |  |
| tax_amount | decimal(15,2) |  | 0.00 |  |
| total_amount | decimal(15,2) |  | 0.00 |  |
| payment_method | enum('COD','BANK_TRANSFER','MOMO','VNPAY','ZALOPAY','CARD','WALLET') |  | COD |  |
| payment_status | enum('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED') |  | PENDING |  |
| order_status | enum('PENDING','CONFIRMED','PREPARING','READY_FOR_PICKUP','SHIPPER_ASSIGNED','PICKED_UP','DELIVERING','DELIVERED','CANCELLED','FAILED') |  | PENDING |  |
| customer_note | varchar(1000) | ✓ |  |  |
| shipper_note | varchar(500) | ✓ |  |  |
| need_utensils | tinyint(1) |  | 1 |  |
| contactless_delivery | tinyint(1) |  | 0 |  |
| restaurant_note | varchar(1000) | ✓ |  |  |
| ordered_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| confirmed_at | datetime | ✓ |  |  |
| prepared_at | datetime | ✓ |  |  |
| picked_up_at | datetime | ✓ |  |  |
| delivered_at | datetime | ✓ |  |  |
| cancelled_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `fk_order_address`(delivery_address_id), `idx_order_created`(created_at), `idx_order_customer`(customer_id), `idx_order_customer_created`(customer_id,created_at), `idx_order_payment_status`(payment_status), `idx_order_restaurant`(restaurant_id), `idx_order_restaurant_status`(restaurant_id,order_status), `idx_order_shipper`(shipper_id), `idx_order_status`(order_status), `order_code`(order_code) UNIQUE, `uk_order_customer_idempotency`(customer_id,idempotency_key) UNIQUE

CHECK: `(`total_amount` >= 0)`; `(`delivery_fee` >= 0)`; `(`discount_amount` >= 0)`; `(`service_fee` >= 0)`; `(`subtotal` >= 0)`; `(`tax_amount` >= 0)`

Trigger: `trg_create_restaurant_commission` (AFTER UPDATE), `trg_order_delivered_loyalty` (AFTER UPDATE), `trg_order_delivered_statistics` (AFTER UPDATE), `trg_order_status_history` (AFTER UPDATE)

### order_items

*40,581 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| menu_item_id | bigint unsigned | ✓ |  | FK → menu_items.id (SET NULL) |
| variant_id | bigint unsigned | ✓ |  | FK → menu_item_variants.id (SET NULL) |
| item_name | varchar(200) |  |  |  |
| variant_name | varchar(100) | ✓ |  |  |
| quantity | int unsigned |  |  |  |
| unit_price | decimal(15,2) |  |  |  |
| total_price | decimal(15,2) |  |  |  |
| note | varchar(500) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_order_item_variant`(variant_id), `idx_order_item_menu`(menu_item_id), `idx_order_item_order`(order_id)

CHECK: `(`unit_price` >= 0)`; `(`quantity` > 0)`; `(`total_price` >= 0)`

Trigger: `trg_order_items_sold_count` (AFTER INSERT)

### order_item_toppings

*15,000 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_item_id | bigint unsigned |  |  | FK → order_items.id (CASCADE) |
| topping_id | bigint unsigned | ✓ |  | FK → toppings.id (SET NULL) |
| topping_name | varchar(150) |  |  |  |
| price | decimal(15,2) |  | 0.00 |  |
| quantity | int unsigned |  | 1 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_order_topping_item`(order_item_id), `fk_order_topping_topping`(topping_id)

CHECK: `(`price` >= 0)`; `(`quantity` > 0)`

### order_status_history

*137,091 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| old_status | varchar(50) | ✓ |  |  |
| new_status | varchar(50) |  |  |  |
| changed_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| note | varchar(500) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_order_history_user`(changed_by), `idx_order_history`(order_id,created_at)

### order_cancellations

*1,306 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | UNIQUE; FK → orders.id (CASCADE) |
| cancelled_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| reason_code | enum('CUSTOMER_CHANGED_MIND','RESTAURANT_REJECTED','OUT_OF_STOCK','SHIPPER_UNAVAILABLE','PAYMENT_FAILED','SYSTEM_TIMEOUT','OTHER') |  |  |  |
| reason | text | ✓ |  |  |
| refund_amount | decimal(15,2) |  | 0.00 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_cancellation_user`(cancelled_by), `order_id`(order_id) UNIQUE

CHECK: `(`refund_amount` >= 0)`

## Tài xế, giao hàng

### shipper_profiles

*16 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | UNIQUE; FK → users.id (CASCADE) |
| full_name | varchar(150) |  |  |  |
| identity_number | varchar(50) | ✓ |  | UNIQUE |
| vehicle_type | enum('MOTORBIKE','BICYCLE','CAR') |  | MOTORBIKE |  |
| vehicle_plate | varchar(30) | ✓ |  |  |
| driving_license | varchar(100) | ✓ |  |  |
| rating | decimal(3,2) |  | 0.00 |  |
| total_reviews | int unsigned |  | 0 |  |
| total_deliveries | int unsigned |  | 0 |  |
| total_earnings | decimal(18,2) |  | 0.00 |  |
| availability_status | enum('OFFLINE','AVAILABLE','BUSY','SUSPENDED') |  | OFFLINE |  |
| current_latitude | decimal(10,7) | ✓ |  |  |
| current_longitude | decimal(10,7) | ✓ |  |  |
| last_location_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `identity_number`(identity_number) UNIQUE, `idx_shipper_rating`(rating), `idx_shipper_status`(availability_status), `user_id`(user_id) UNIQUE

CHECK: `(`rating` between 0 and 5)`

### shipper_documents

*48 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| shipper_id | bigint unsigned |  |  | FK → shipper_profiles.id (CASCADE) |
| document_type | enum('IDENTITY_CARD','DRIVING_LICENSE','VEHICLE_REGISTRATION','OTHER') |  |  |  |
| document_number | varchar(100) | ✓ |  |  |
| image_url | varchar(500) | ✓ |  |  |
| verified | tinyint(1) |  | 0 |  |
| verified_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| verified_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_shipper_document_shipper`(shipper_id), `fk_shipper_document_verifier`(verified_by)

### delivery_assignments

*16,810 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| shipper_id | bigint unsigned |  |  | FK → shipper_profiles.id (CASCADE) |
| assigned_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| assignment_status | enum('OFFERED','ACCEPTED','REJECTED','EXPIRED','CANCELLED') |  | OFFERED |  |
| offered_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| accepted_at | datetime | ✓ |  |  |
| rejected_at | datetime | ✓ |  |  |
| expired_at | datetime | ✓ |  |  |
| reject_reason | varchar(500) | ✓ |  |  |

Chỉ mục: `fk_assignment_user`(assigned_by), `idx_assignment_order`(order_id), `idx_assignment_shipper`(shipper_id,assignment_status)

Trigger: `trg_assignment_accept` (AFTER UPDATE)

### deliveries

*16,810 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | UNIQUE; FK → orders.id (CASCADE) |
| shipper_id | bigint unsigned | ✓ |  | FK → shipper_profiles.id (SET NULL) |
| pickup_address | varchar(500) |  |  |  |
| delivery_address | varchar(500) |  |  |  |
| pickup_latitude | decimal(10,7) | ✓ |  |  |
| pickup_longitude | decimal(10,7) | ✓ |  |  |
| delivery_latitude | decimal(10,7) | ✓ |  |  |
| delivery_longitude | decimal(10,7) | ✓ |  |  |
| distance_km | decimal(10,2) | ✓ | 0.00 |  |
| delivery_fee | decimal(15,2) |  | 0.00 |  |
| delivery_status | enum('PENDING','ASSIGNED','ACCEPTED','PICKED_UP','DELIVERING','DELIVERED','FAILED','CANCELLED') |  | PENDING |  |
| assigned_at | datetime | ✓ |  |  |
| accepted_at | datetime | ✓ |  |  |
| picked_up_at | datetime | ✓ |  |  |
| delivered_at | datetime | ✓ |  |  |
| proof_image_url | varchar(500) | ✓ |  |  |
| receiver_signature_url | varchar(500) | ✓ |  |  |
| delivery_note | varchar(1000) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `idx_delivery_created`(created_at), `idx_delivery_shipper`(shipper_id), `idx_delivery_status`(delivery_status), `order_id`(order_id) UNIQUE

CHECK: `(`distance_km` >= 0)`; `(`delivery_fee` >= 0)`

Trigger: `trg_delivery_status_sync` (AFTER UPDATE), `trg_shipper_available_after_delivery` (AFTER UPDATE)

### delivery_status_history

*117,642 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| delivery_id | bigint unsigned |  |  | FK → deliveries.id (CASCADE) |
| status | varchar(50) |  |  |  |
| latitude | decimal(10,7) | ✓ |  |  |
| longitude | decimal(10,7) | ✓ |  |  |
| note | varchar(500) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_delivery_history`(delivery_id)

### shipper_locations

*33,610 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| shipper_id | bigint unsigned |  |  | FK → shipper_profiles.id (CASCADE) |
| delivery_id | bigint unsigned | ✓ |  | FK → deliveries.id (SET NULL) |
| latitude | decimal(10,7) |  |  |  |
| longitude | decimal(10,7) |  |  |  |
| speed | decimal(8,2) | ✓ | 0.00 |  |
| heading | decimal(6,2) | ✓ | 0.00 |  |
| accuracy | decimal(8,2) | ✓ |  |  |
| recorded_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `idx_delivery_locations`(delivery_id,recorded_at), `idx_shipper_locations_time`(shipper_id,recorded_at)

Trigger: `trg_shipper_location_update` (AFTER INSERT)

### shipper_earnings

*16,546 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| shipper_id | bigint unsigned |  |  | FK → shipper_profiles.id (CASCADE) |
| delivery_id | bigint unsigned |  |  | UNIQUE; FK → deliveries.id (CASCADE) |
| delivery_fee | decimal(15,2) |  | 0.00 |  |
| bonus | decimal(15,2) |  | 0.00 |  |
| tip_amount | decimal(15,2) |  | 0.00 |  |
| platform_fee | decimal(15,2) |  | 0.00 |  |
| net_earning | decimal(15,2) |  | 0.00 |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `delivery_id`(delivery_id) UNIQUE, `fk_earning_shipper`(shipper_id)

CHECK: `(`net_earning` >= 0)`

### shipper_withdrawals

*19 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| shipper_id | bigint unsigned |  |  | FK → shipper_profiles.id (RESTRICT) |
| amount | decimal(15,2) |  |  |  |
| bank_name | varchar(150) | ✓ |  |  |
| bank_account | varchar(100) | ✓ |  |  |
| account_holder | varchar(150) | ✓ |  |  |
| status | enum('PENDING','APPROVED','COMPLETED','REJECTED') |  | PENDING |  |
| requested_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| processed_at | datetime | ✓ |  |  |
| processed_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| reject_reason | varchar(500) | ✓ |  |  |

Chỉ mục: `fk_withdraw_processor`(processed_by), `fk_withdraw_shipper`(shipper_id)

CHECK: `(`amount` > 0)`

## Thanh toán, tài chính

### payments

*18,125 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| payment_code | varchar(100) |  |  | UNIQUE |
| method | enum('COD','BANK_TRANSFER','MOMO','VNPAY','ZALOPAY','CARD','WALLET') |  |  |  |
| amount | decimal(15,2) |  |  |  |
| status | enum('PENDING','PROCESSING','PAID','FAILED','CANCELLED','REFUNDED') |  | PENDING |  |
| transaction_id | varchar(255) | ✓ |  |  |
| gateway | varchar(100) | ✓ |  |  |
| paid_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `idx_payment_order`(order_id), `idx_payment_status`(status), `idx_payment_transaction`(transaction_id), `payment_code`(payment_code) UNIQUE

CHECK: `(`amount` >= 0)`

Trigger: `trg_payment_paid` (AFTER UPDATE)

### payment_transactions

*9,794 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| payment_id | bigint unsigned |  |  | FK → payments.id (CASCADE) |
| transaction_type | enum('PAYMENT','VERIFY','REFUND','CALLBACK') |  |  |  |
| request_data | json | ✓ |  |  |
| response_data | json | ✓ |  |  |
| status | varchar(50) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_payment_transaction_payment`(payment_id)

### cod_transactions

*7,924 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| shipper_id | bigint unsigned |  |  | FK → shipper_profiles.id (RESTRICT) |
| amount | decimal(15,2) |  |  |  |
| status | enum('PENDING','COLLECTED','SETTLED','FAILED') |  | PENDING |  |
| collected_at | datetime | ✓ |  |  |
| settled_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `fk_cod_order`(order_id), `idx_cod_shipper`(shipper_id), `idx_cod_status`(status)

CHECK: `(`amount` >= 0)`

Trigger: `trg_cod_collected` (AFTER UPDATE)

### refunds

*1,226 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| payment_id | bigint unsigned | ✓ |  | FK → payments.id (SET NULL) |
| amount | decimal(15,2) |  |  |  |
| reason | text | ✓ |  |  |
| status | enum('PENDING','PROCESSING','COMPLETED','FAILED','REJECTED') |  | PENDING |  |
| processed_by | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| transaction_id | varchar(255) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| processed_at | datetime | ✓ |  |  |

Chỉ mục: `fk_refund_order`(order_id), `fk_refund_payment`(payment_id), `fk_refund_user`(processed_by)

CHECK: `(`amount` > 0)`

### invoices

*3,356 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| invoice_number | varchar(100) |  |  | UNIQUE |
| order_id | bigint unsigned |  |  | UNIQUE; FK → orders.id (RESTRICT) |
| customer_name | varchar(200) |  |  |  |
| restaurant_name | varchar(200) |  |  |  |
| subtotal | decimal(15,2) |  |  |  |
| discount_amount | decimal(15,2) |  | 0.00 |  |
| delivery_fee | decimal(15,2) |  | 0.00 |  |
| service_fee | decimal(15,2) |  | 0.00 |  |
| tax_amount | decimal(15,2) |  | 0.00 |  |
| total_amount | decimal(15,2) |  |  |  |
| issued_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| pdf_url | varchar(500) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `invoice_number`(invoice_number) UNIQUE, `order_id`(order_id) UNIQUE

CHECK: `(`total_amount` >= 0)`

### wallets

*48 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | UNIQUE; FK → users.id (CASCADE) |
| balance | decimal(18,2) |  | 0.00 |  |
| status | enum('ACTIVE','LOCKED') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `user_id`(user_id) UNIQUE

CHECK: `(`balance` >= 0)`

### wallet_transactions

*39 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| wallet_id | bigint unsigned |  |  | FK → wallets.id (CASCADE) |
| type | enum('DEPOSIT','PAYMENT','REFUND','EARNING','WITHDRAWAL','ADJUSTMENT') |  |  |  |
| amount | decimal(18,2) |  |  |  |
| reference_type | varchar(50) | ✓ |  |  |
| reference_id | bigint unsigned | ✓ |  |  |
| balance_before | decimal(18,2) |  |  |  |
| balance_after | decimal(18,2) |  |  |  |
| description | varchar(500) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_wallet_transaction_wallet`(wallet_id)

CHECK: `(`amount` >= 0)`

### restaurant_commissions

*16,546 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | UNIQUE; FK → orders.id (CASCADE) |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| order_amount | decimal(15,2) |  |  |  |
| commission_rate | decimal(5,2) |  |  |  |
| commission_amount | decimal(15,2) |  |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_commission_restaurant`(restaurant_id), `order_id`(order_id) UNIQUE

CHECK: `(`commission_rate` between 0 and 100)`; `(`commission_amount` >= 0)`

### restaurant_settlements

*140 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (RESTRICT) |
| period_start | date |  |  |  |
| period_end | date |  |  |  |
| gross_sales | decimal(18,2) |  | 0.00 |  |
| commission_amount | decimal(18,2) |  | 0.00 |  |
| refund_amount | decimal(18,2) |  | 0.00 |  |
| adjustment_amount | decimal(18,2) |  | 0.00 |  |
| net_amount | decimal(18,2) |  | 0.00 |  |
| status | enum('PENDING','PROCESSING','SETTLED','FAILED') |  | PENDING |  |
| settled_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `idx_restaurant_settlement`(restaurant_id,period_start,period_end)

CHECK: `(`period_end` >= `period_start`)`

## Khuyến mãi, điểm thưởng

### promotions

*129 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| restaurant_id | bigint unsigned | ✓ |  | FK → restaurants.id (CASCADE) |
| customer_id | bigint unsigned | ✓ |  | FK → customer_profiles.id (CASCADE) |
| code | varchar(50) |  |  | UNIQUE |
| name | varchar(200) |  |  |  |
| description | text | ✓ |  |  |
| discount_type | enum('PERCENT','FIXED_AMOUNT','FREE_DELIVERY') |  |  |  |
| discount_value | decimal(15,2) |  |  |  |
| max_discount | decimal(15,2) | ✓ |  |  |
| minimum_order | decimal(15,2) |  | 0.00 |  |
| start_at | datetime |  |  |  |
| end_at | datetime |  |  |  |
| usage_limit | int unsigned | ✓ |  |  |
| usage_per_customer | int unsigned |  | 1 |  |
| first_order_only | tinyint(1) |  | 0 |  |
| used_count | int unsigned |  | 0 |  |
| status | enum('ACTIVE','INACTIVE','EXPIRED') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `code`(code) UNIQUE, `fk_promotion_customer`(customer_id), `idx_promotion_restaurant`(restaurant_id), `idx_promotion_status_time`(status,start_at,end_at)

CHECK: `(`end_at` > `start_at`)`; `(`discount_value` >= 0)`; `(`minimum_order` >= 0)`

### promotion_usage

*2,354 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| promotion_id | bigint unsigned |  |  | FK → promotions.id (RESTRICT) |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (RESTRICT) |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| discount_amount | decimal(15,2) |  | 0.00 |  |
| used_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_promotion_usage_customer`(customer_id), `fk_promotion_usage_order`(order_id), `uk_promotion_order`(promotion_id,order_id) UNIQUE

Trigger: `trg_promotion_usage_counter` (AFTER INSERT)

### loyalty_rewards

*5 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| name | varchar(200) |  |  |  |
| description | varchar(500) | ✓ |  |  |
| points_cost | int unsigned |  |  |  |
| discount_type | enum('PERCENT','FIXED_AMOUNT','FREE_DELIVERY') |  |  |  |
| discount_value | decimal(15,2) |  |  |  |
| max_discount | decimal(15,2) | ✓ |  |  |
| minimum_order | decimal(15,2) |  | 0.00 |  |
| valid_days | int unsigned |  | 30 |  |
| stock | int unsigned | ✓ |  |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

CHECK: `(`points_cost` > 0)`

### loyalty_transactions

*16,631 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (CASCADE) |
| type | enum('EARN','REDEEM','ADJUST') |  |  |  |
| points | int |  |  |  |
| balance_after | int |  |  |  |
| order_id | bigint unsigned | ✓ |  | FK → orders.id (SET NULL) |
| reward_id | bigint unsigned | ✓ |  | FK → loyalty_rewards.id (SET NULL) |
| promotion_id | bigint unsigned | ✓ |  |  |
| description | varchar(300) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_loyalty_reward`(reward_id), `idx_loyalty_customer`(customer_id,created_at), `uk_loyalty_order_earn`(order_id,type) UNIQUE

Trigger: `trg_loyalty_transaction_balance` (AFTER INSERT), `trg_loyalty_transaction_before` (BEFORE INSERT)

### banners

*13 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| title | varchar(255) |  |  |  |
| image_url | varchar(500) |  |  |  |
| target_url | varchar(500) | ✓ |  |  |
| start_at | datetime | ✓ |  |  |
| end_at | datetime | ✓ |  |  |
| sort_order | int |  | 0 |  |
| status | enum('ACTIVE','INACTIVE') |  | ACTIVE |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

## Đánh giá, hỗ trợ, giao tiếp

### restaurant_reviews

*13,095 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | UNIQUE; FK → orders.id (CASCADE) |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (CASCADE) |
| restaurant_id | bigint unsigned |  |  | FK → restaurants.id (CASCADE) |
| rating | tinyint unsigned |  |  |  |
| comment | text | ✓ |  |  |
| restaurant_reply | text | ✓ |  |  |
| replied_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `fk_review_restaurant`(restaurant_id), `fk_review_restaurant_customer`(customer_id), `order_id`(order_id) UNIQUE

CHECK: `(`rating` between 1 and 5)`

Trigger: `trg_restaurant_review_insert` (AFTER INSERT), `trg_restaurant_review_update` (AFTER UPDATE)

### shipper_reviews

*11,518 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | UNIQUE; FK → orders.id (CASCADE) |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (CASCADE) |
| shipper_id | bigint unsigned |  |  | FK → shipper_profiles.id (CASCADE) |
| rating | tinyint unsigned |  |  |  |
| comment | text | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `fk_shipper_review_customer`(customer_id), `fk_shipper_review_shipper`(shipper_id), `order_id`(order_id) UNIQUE

CHECK: `(`rating` between 1 and 5)`

Trigger: `trg_shipper_review_insert` (AFTER INSERT), `trg_shipper_review_update` (AFTER UPDATE)

### menu_item_reviews

*15,920 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned |  |  | FK → orders.id (CASCADE) |
| order_item_id | bigint unsigned |  |  | UNIQUE; FK → order_items.id (CASCADE) |
| menu_item_id | bigint unsigned |  |  | FK → menu_items.id (CASCADE) |
| customer_id | bigint unsigned |  |  | FK → customer_profiles.id (CASCADE) |
| rating | tinyint unsigned |  |  |  |
| comment | text | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| deleted_at | datetime | ✓ |  |  |

Chỉ mục: `idx_menu_item_review_customer`(customer_id), `idx_menu_item_review_item`(menu_item_id,deleted_at,created_at), `idx_menu_item_review_order`(order_id), `uk_menu_item_review_order_item`(order_item_id) UNIQUE

CHECK: `(`rating` between 1 and 5)`

Trigger: `trg_menu_item_review_insert` (AFTER INSERT), `trg_menu_item_review_update` (AFTER UPDATE)

### support_tickets

*590 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| ticket_code | varchar(50) |  |  | UNIQUE |
| user_id | bigint unsigned |  |  | FK → users.id (RESTRICT) |
| order_id | bigint unsigned | ✓ |  | FK → orders.id (SET NULL) |
| subject | varchar(255) |  |  |  |
| description | text |  |  |  |
| category | enum('ORDER','PAYMENT','DELIVERY','RESTAURANT','SHIPPER','ACCOUNT','OTHER') |  | OTHER |  |
| priority | enum('LOW','MEDIUM','HIGH','URGENT') |  | MEDIUM |  |
| status | enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') |  | OPEN |  |
| assigned_admin_id | bigint unsigned | ✓ |  | FK → users.id (SET NULL) |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| resolved_at | datetime | ✓ |  |  |

Chỉ mục: `fk_ticket_order`(order_id), `idx_ticket_admin`(assigned_admin_id), `idx_ticket_status`(status), `idx_ticket_user`(user_id), `ticket_code`(ticket_code) UNIQUE

### support_messages

*587 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| ticket_id | bigint unsigned |  |  | FK → support_tickets.id (CASCADE) |
| sender_id | bigint unsigned |  |  | FK → users.id (RESTRICT) |
| message | text |  |  |  |
| attachment_url | varchar(500) | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_support_message_sender`(sender_id), `fk_support_message_ticket`(ticket_id)

### chat_sessions

*498 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| order_id | bigint unsigned | ✓ |  | FK → orders.id (CASCADE) |
| customer_id | bigint unsigned | ✓ |  | FK → customer_profiles.id (SET NULL) |
| shipper_id | bigint unsigned | ✓ |  | FK → shipper_profiles.id (SET NULL) |
| restaurant_id | bigint unsigned | ✓ |  | FK → restaurants.id (SET NULL) |
| status | enum('OPEN','CLOSED') |  | OPEN |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| closed_at | datetime | ✓ |  |  |

Chỉ mục: `fk_chat_customer`(customer_id), `fk_chat_restaurant`(restaurant_id), `fk_chat_shipper`(shipper_id), `idx_chat_session_order`(order_id)

### chat_messages

*990 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| session_id | bigint unsigned |  |  | FK → chat_sessions.id (CASCADE) |
| sender_id | bigint unsigned |  |  | FK → users.id (CASCADE) |
| message | text |  |  |  |
| message_type | enum('TEXT','IMAGE','LOCATION','SYSTEM') |  | TEXT |  |
| attachment_url | varchar(500) | ✓ |  |  |
| is_read | tinyint(1) |  | 0 |  |
| read_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `fk_chat_message_sender`(sender_id), `idx_chat_message_session`(session_id,created_at)

### notifications

*138,108 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | FK → users.id (CASCADE) |
| title | varchar(255) |  |  |  |
| message | text |  |  |  |
| type | enum('ORDER','DELIVERY','PAYMENT','PROMOTION','SYSTEM','SUPPORT') |  | SYSTEM |  |
| reference_type | varchar(50) | ✓ |  |  |
| reference_id | bigint unsigned | ✓ |  |  |
| is_read | tinyint(1) |  | 0 |  |
| read_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Chỉ mục: `idx_notification_created`(created_at), `idx_notification_user_read`(user_id,is_read)

### notification_preferences

*23 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | UNIQUE; FK → users.id (CASCADE) |
| email_enabled | tinyint(1) |  | 1 |  |
| push_enabled | tinyint(1) |  | 1 |  |
| order_updates | tinyint(1) |  | 1 |  |
| promotion_updates | tinyint(1) |  | 1 |  |
| system_updates | tinyint(1) |  | 1 |  |
| updated_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Chỉ mục: `user_id`(user_id) UNIQUE

## Job nền, nhập/xuất

### export_jobs

*0 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | FK → users.id (RESTRICT) |
| export_type | varchar(100) |  |  |  |
| format | enum('CSV','EXCEL','PDF') |  |  |  |
| file_url | varchar(500) | ✓ |  |  |
| status | enum('PENDING','PROCESSING','COMPLETED','FAILED') |  | PENDING |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| completed_at | datetime | ✓ |  |  |

Chỉ mục: `fk_export_user`(user_id)

### import_jobs

*0 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| user_id | bigint unsigned |  |  | FK → users.id (RESTRICT) |
| job_type | varchar(100) |  |  |  |
| file_url | varchar(500) |  |  |  |
| total_rows | int unsigned |  | 0 |  |
| success_rows | int unsigned |  | 0 |  |
| failed_rows | int unsigned |  | 0 |  |
| status | enum('PENDING','PROCESSING','COMPLETED','FAILED') |  | PENDING |  |
| error_log | text | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| completed_at | datetime | ✓ |  |  |

Chỉ mục: `fk_import_user`(user_id)

### background_jobs

*5 dòng*

| Cột | Kiểu | Null | Mặc định | Ghi chú |
|---|---|---|---|---|
| id | bigint unsigned |  |  | PK; auto_increment |
| job_type | varchar(100) |  |  |  |
| payload | json | ✓ |  |  |
| status | enum('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED') |  | PENDING |  |
| attempts | int unsigned |  | 0 |  |
| error_message | text | ✓ |  |  |
| scheduled_at | datetime | ✓ |  |  |
| started_at | datetime | ✓ |  |  |
| completed_at | datetime | ✓ |  |  |
| created_at | datetime |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

## Trigger (nội dung đầy đủ)

Trigger giữ số liệu thống kê/điểm thưởng/lịch sử nhất quán — **không cập nhật các cột này bằng tay hoặc trong code ứng dụng**, trừ khi cố ý.

### trg_cod_collected

`AFTER UPDATE ON cod_transactions`

```sql
BEGIN

    IF
        OLD.status <> 'COLLECTED'
        AND NEW.status = 'COLLECTED'
    THEN

        UPDATE orders
        SET
            payment_status = 'PAID'
        WHERE id = NEW.order_id;

    END IF;

END
```

### trg_delivery_status_sync

`AFTER UPDATE ON deliveries`

```sql
BEGIN

    IF OLD.delivery_status <> NEW.delivery_status THEN

        INSERT INTO delivery_status_history (
            delivery_id,
            status,
            note
        )
        VALUES (
            NEW.id,
            NEW.delivery_status,
            'Automatically recorded'
        );


        IF NEW.delivery_status = 'ASSIGNED' THEN

            UPDATE orders
            SET
                order_status = 'SHIPPER_ASSIGNED',
                shipper_id = NEW.shipper_id
            WHERE id = NEW.order_id;

        ELSEIF NEW.delivery_status = 'PICKED_UP' THEN

            UPDATE orders
            SET
                order_status = 'PICKED_UP',
                picked_up_at =
                    COALESCE(
                        NEW.picked_up_at,
                        CURRENT_TIMESTAMP
                    )
            WHERE id = NEW.order_id;

        ELSEIF NEW.delivery_status = 'DELIVERING' THEN

            UPDATE orders
            SET
                order_status = 'DELIVERING'
            WHERE id = NEW.order_id;

        ELSEIF NEW.delivery_status = 'DELIVERED' THEN

            UPDATE orders
            SET
                order_status = 'DELIVERED',
                delivered_at =
                    COALESCE(
                        NEW.delivered_at,
                        CURRENT_TIMESTAMP
                    )
            WHERE id = NEW.order_id;

        ELSEIF NEW.delivery_status = 'FAILED' THEN

            UPDATE orders
            SET
                order_status = 'FAILED'
            WHERE id = NEW.order_id;

        END IF;

    END IF;

END
```

### trg_shipper_available_after_delivery

`AFTER UPDATE ON deliveries`

```sql
BEGIN

    IF
        OLD.delivery_status <> 'DELIVERED'
        AND NEW.delivery_status = 'DELIVERED'
        AND NEW.shipper_id IS NOT NULL
    THEN

        UPDATE shipper_profiles
        SET
            availability_status = 'AVAILABLE'
        WHERE id = NEW.shipper_id;

    END IF;

END
```

### trg_assignment_accept

`AFTER UPDATE ON delivery_assignments`

```sql
BEGIN

    IF
        OLD.assignment_status <> 'ACCEPTED'
        AND NEW.assignment_status = 'ACCEPTED'
    THEN

        UPDATE orders
        SET
            shipper_id = NEW.shipper_id,
            order_status = 'SHIPPER_ASSIGNED'
        WHERE id = NEW.order_id;


        UPDATE deliveries
        SET
            shipper_id = NEW.shipper_id,
            delivery_status = 'ASSIGNED',
            assigned_at = CURRENT_TIMESTAMP
        WHERE order_id = NEW.order_id;


        UPDATE shipper_profiles
        SET
            availability_status = 'BUSY'
        WHERE id = NEW.shipper_id;

    END IF;

END
```

### trg_loyalty_transaction_balance

`AFTER INSERT ON loyalty_transactions`

```sql
UPDATE customer_profiles SET loyalty_points = GREATEST(0, CAST(loyalty_points AS SIGNED) + NEW.points) WHERE id = NEW.customer_id
```

### trg_loyalty_transaction_before

`BEFORE INSERT ON loyalty_transactions`

```sql
SET NEW.balance_after = (SELECT loyalty_points FROM customer_profiles WHERE id = NEW.customer_id) + NEW.points
```

### trg_menu_item_review_insert

`AFTER INSERT ON menu_item_reviews`

```sql
BEGIN
    UPDATE menu_items
    SET rating = (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM menu_item_reviews
                  WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL),
        total_reviews = (SELECT COUNT(*) FROM menu_item_reviews
                         WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL)
    WHERE id = NEW.menu_item_id;
END
```

### trg_menu_item_review_update

`AFTER UPDATE ON menu_item_reviews`

```sql
BEGIN
    UPDATE menu_items
    SET rating = (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM menu_item_reviews
                  WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL),
        total_reviews = (SELECT COUNT(*) FROM menu_item_reviews
                         WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL)
    WHERE id = NEW.menu_item_id;
END
```

### trg_order_items_sold_count

`AFTER INSERT ON order_items`

```sql
BEGIN

    IF NEW.menu_item_id IS NOT NULL THEN

        UPDATE menu_items
        SET
            sold_count =
                sold_count + NEW.quantity
        WHERE id = NEW.menu_item_id;

    END IF;

END
```

### trg_create_restaurant_commission

`AFTER UPDATE ON orders`

```sql
BEGIN

    DECLARE v_rate DECIMAL(5,2);

    IF
        OLD.order_status <> 'DELIVERED'
        AND NEW.order_status = 'DELIVERED'
    THEN

        SELECT commission_rate
        INTO v_rate
        FROM restaurants
        WHERE id = NEW.restaurant_id;


        INSERT IGNORE INTO restaurant_commissions (
            order_id,
            restaurant_id,
            order_amount,
            commission_rate,
            commission_amount
        )
        VALUES (
            NEW.id,
            NEW.restaurant_id,
            NEW.subtotal,
            v_rate,
            ROUND(
                NEW.subtotal
                * v_rate
                / 100,
                2
            )
        );

    END IF;

END
```

### trg_order_delivered_loyalty

`AFTER UPDATE ON orders`

```sql
INSERT INTO loyalty_transactions (customer_id, type, points, balance_after, order_id, description) SELECT NEW.customer_id, 'EARN', FLOOR(NEW.subtotal / 1000), 0, NEW.id, CONCAT('Tích điểm đơn ', NEW.order_code) FROM DUAL WHERE NEW.order_status = 'DELIVERED' AND OLD.order_status <> 'DELIVERED' AND FLOOR(NEW.subtotal / 1000) > 0
```

### trg_order_delivered_statistics

`AFTER UPDATE ON orders`

```sql
BEGIN

    IF
        OLD.order_status <> 'DELIVERED'
        AND NEW.order_status = 'DELIVERED'
    THEN

        UPDATE customer_profiles
        SET
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total_amount
        WHERE id = NEW.customer_id;


        UPDATE restaurants
        SET
            total_orders = total_orders + 1,
            total_revenue =
                total_revenue + NEW.subtotal
        WHERE id = NEW.restaurant_id;


        IF NEW.shipper_id IS NOT NULL THEN

            UPDATE shipper_profiles
            SET
                total_deliveries =
                    total_deliveries + 1
            WHERE id = NEW.shipper_id;

        END IF;

    END IF;

END
```

### trg_order_status_history

`AFTER UPDATE ON orders`

```sql
BEGIN

    IF OLD.order_status <> NEW.order_status THEN

        INSERT INTO order_status_history (
            order_id,
            old_status,
            new_status,
            changed_by,
            note
        )
        VALUES (
            NEW.id,
            OLD.order_status,
            NEW.order_status,
            NULL,
            'Status automatically recorded by trigger'
        );

    END IF;

END
```

### trg_payment_paid

`AFTER UPDATE ON payments`

```sql
BEGIN

    IF
        OLD.status <> 'PAID'
        AND NEW.status = 'PAID'
    THEN

        UPDATE orders
        SET
            payment_status = 'PAID'
        WHERE id = NEW.order_id;

    END IF;

END
```

### trg_promotion_usage_counter

`AFTER INSERT ON promotion_usage`

```sql
BEGIN

    UPDATE promotions
    SET
        used_count = used_count + 1
    WHERE id = NEW.promotion_id;

END
```

### trg_restaurant_review_insert

`AFTER INSERT ON restaurant_reviews`

```sql
BEGIN

    UPDATE restaurants
    SET
        rating = (
            SELECT
                COALESCE(
                    ROUND(AVG(rating), 2),
                    0
                )
            FROM restaurant_reviews
            WHERE
                restaurant_id =
                    NEW.restaurant_id
                AND deleted_at IS NULL
        ),

        total_reviews = (
            SELECT COUNT(*)
            FROM restaurant_reviews
            WHERE
                restaurant_id =
                    NEW.restaurant_id
                AND deleted_at IS NULL
        )

    WHERE id = NEW.restaurant_id;

END
```

### trg_restaurant_review_update

`AFTER UPDATE ON restaurant_reviews`

```sql
BEGIN

    UPDATE restaurants
    SET
        rating = (
            SELECT
                COALESCE(
                    ROUND(AVG(rating), 2),
                    0
                )
            FROM restaurant_reviews
            WHERE
                restaurant_id =
                    NEW.restaurant_id
                AND deleted_at IS NULL
        ),

        total_reviews = (
            SELECT COUNT(*)
            FROM restaurant_reviews
            WHERE
                restaurant_id =
                    NEW.restaurant_id
                AND deleted_at IS NULL
        )

    WHERE id = NEW.restaurant_id;

END
```

### trg_shipper_location_update

`AFTER INSERT ON shipper_locations`

```sql
BEGIN

    UPDATE shipper_profiles
    SET
        current_latitude =
            NEW.latitude,
        current_longitude =
            NEW.longitude,
        last_location_at =
            NEW.recorded_at

    WHERE id = NEW.shipper_id;

END
```

### trg_shipper_review_insert

`AFTER INSERT ON shipper_reviews`

```sql
BEGIN

    UPDATE shipper_profiles
    SET
        rating = (
            SELECT
                COALESCE(
                    ROUND(AVG(rating), 2),
                    0
                )
            FROM shipper_reviews
            WHERE
                shipper_id =
                    NEW.shipper_id
                AND deleted_at IS NULL
        ),

        total_reviews = (
            SELECT COUNT(*)
            FROM shipper_reviews
            WHERE
                shipper_id =
                    NEW.shipper_id
                AND deleted_at IS NULL
        )

    WHERE id = NEW.shipper_id;

END
```

### trg_shipper_review_update

`AFTER UPDATE ON shipper_reviews`

```sql
BEGIN

    UPDATE shipper_profiles
    SET
        rating = (
            SELECT
                COALESCE(
                    ROUND(AVG(rating), 2),
                    0
                )
            FROM shipper_reviews
            WHERE
                shipper_id =
                    NEW.shipper_id
                AND deleted_at IS NULL
        ),

        total_reviews = (
            SELECT COUNT(*)
            FROM shipper_reviews
            WHERE
                shipper_id =
                    NEW.shipper_id
                AND deleted_at IS NULL
        )

    WHERE id = NEW.shipper_id;

END
```

