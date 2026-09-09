CREATE DATABASE IF NOT EXISTS food_delivery_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE food_delivery_db;

SET NAMES utf8mb4;
SET time_zone = '+07:00';
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 2. USERS
-- =========================================================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,

    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,

    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),

    status ENUM(
        'ACTIVE',
        'INACTIVE',
        'LOCKED',
        'PENDING'
    ) NOT NULL DEFAULT 'PENDING',

    email_verified_at DATETIME NULL,
    phone_verified_at DATETIME NULL,
    last_login_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- 3. PERMISSIONS
-- =========================================================

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 4. ROLE_PERMISSIONS
-- =========================================================

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 5. CUSTOMER_PROFILES
-- =========================================================

CREATE TABLE customer_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,

    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NULL,

    gender ENUM(
        'MALE',
        'FEMALE',
        'OTHER'
    ) NULL,

    loyalty_points INT UNSIGNED NOT NULL DEFAULT 0,

    total_orders INT UNSIGNED NOT NULL DEFAULT 0,
    total_spent DECIMAL(18,2) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_customer_loyalty
        CHECK (loyalty_points >= 0),

    CONSTRAINT chk_customer_spent
        CHECK (total_spent >= 0),

    CONSTRAINT fk_customer_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 6. CUSTOMER_ADDRESSES
-- =========================================================

CREATE TABLE customer_addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,

    label VARCHAR(50),

    receiver_name VARCHAR(150) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,

    address_line VARCHAR(255) NOT NULL,
    ward VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100) NOT NULL,

    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT fk_address_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 7. RESTAURANT_CATEGORIES
-- =========================================================

CREATE TABLE restaurant_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    image_url VARCHAR(500),

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 8. RESTAURANTS
-- =========================================================

CREATE TABLE restaurants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    owner_user_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NULL,

    name VARCHAR(200) NOT NULL,
    description TEXT,

    phone VARCHAR(20),
    email VARCHAR(150),

    address VARCHAR(255) NOT NULL,
    ward VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100) NOT NULL,

    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    opening_time TIME NULL,
    closing_time TIME NULL,

    minimum_order DECIMAL(15,2) NOT NULL DEFAULT 0,
    average_prepare_time INT UNSIGNED NOT NULL DEFAULT 20,

    rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
    total_orders INT UNSIGNED NOT NULL DEFAULT 0,
    total_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,

    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    status ENUM(
        'PENDING',
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED'
    ) NOT NULL DEFAULT 'PENDING',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT chk_restaurant_rating
        CHECK (rating BETWEEN 0 AND 5),

    CONSTRAINT chk_restaurant_commission
        CHECK (commission_rate BETWEEN 0 AND 100),

    CONSTRAINT chk_restaurant_min_order
        CHECK (minimum_order >= 0),

    CONSTRAINT fk_restaurant_owner
        FOREIGN KEY (owner_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_restaurant_category
        FOREIGN KEY (category_id)
        REFERENCES restaurant_categories(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 9. RESTAURANT_OPERATING_HOURS
-- =========================================================

CREATE TABLE restaurant_operating_hours (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NOT NULL,

    day_of_week TINYINT UNSIGNED NOT NULL,

    open_time TIME NULL,
    close_time TIME NULL,

    is_closed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_restaurant_day (
        restaurant_id,
        day_of_week
    ),

    CONSTRAINT chk_day_of_week
        CHECK (day_of_week BETWEEN 1 AND 7),

    CONSTRAINT fk_operating_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 10. RESTAURANT_IMAGES
-- =========================================================

CREATE TABLE restaurant_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NOT NULL,

    image_url VARCHAR(500) NOT NULL,

    image_type ENUM(
        'LOGO',
        'COVER',
        'GALLERY'
    ) NOT NULL DEFAULT 'GALLERY',

    sort_order INT NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_restaurant_image
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 11. MENUS
-- =========================================================

CREATE TABLE menus (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),

    start_time TIME NULL,
    end_time TIME NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT fk_menu_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 12. MENU_CATEGORIES
-- =========================================================

CREATE TABLE menu_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NOT NULL,
    menu_id BIGINT UNSIGNED NULL,

    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),

    sort_order INT NOT NULL DEFAULT 0,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_menu_category_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_menu_category_menu
        FOREIGN KEY (menu_id)
        REFERENCES menus(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 13. MENU_ITEMS
-- =========================================================

CREATE TABLE menu_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NULL,

    name VARCHAR(200) NOT NULL,
    description TEXT,

    image_url VARCHAR(500),

    base_price DECIMAL(15,2) NOT NULL,
    discount_price DECIMAL(15,2) NULL,

    preparation_time INT UNSIGNED DEFAULT 15,

    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,

    sold_count INT UNSIGNED NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT chk_menu_price
        CHECK (base_price >= 0),

    CONSTRAINT chk_menu_discount
        CHECK (
            discount_price IS NULL
            OR discount_price >= 0
        ),

    CONSTRAINT fk_menu_item_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_menu_item_category
        FOREIGN KEY (category_id)
        REFERENCES menu_categories(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 14. MENU_ITEM_VARIANTS
-- =========================================================

CREATE TABLE menu_item_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    menu_item_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(100) NOT NULL,

    price_adjustment DECIMAL(15,2) NOT NULL DEFAULT 0,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_variant_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 15. TOPPING_GROUPS
-- =========================================================

CREATE TABLE topping_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,

    min_select INT UNSIGNED NOT NULL DEFAULT 0,
    max_select INT UNSIGNED NOT NULL DEFAULT 1,

    required BOOLEAN NOT NULL DEFAULT FALSE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_topping_selection
        CHECK (max_select >= min_select),

    CONSTRAINT fk_topping_group_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 16. TOPPINGS
-- =========================================================

CREATE TABLE toppings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    group_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,

    price DECIMAL(15,2) NOT NULL DEFAULT 0,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_topping_price
        CHECK (price >= 0),

    CONSTRAINT fk_topping_group
        FOREIGN KEY (group_id)
        REFERENCES topping_groups(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 17. MENU_ITEM_TOPPING_GROUPS
-- =========================================================

CREATE TABLE menu_item_topping_groups (
    menu_item_id BIGINT UNSIGNED NOT NULL,
    topping_group_id BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (
        menu_item_id,
        topping_group_id
    ),

    CONSTRAINT fk_mitg_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mitg_group
        FOREIGN KEY (topping_group_id)
        REFERENCES topping_groups(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 18. SHIPPER_PROFILES
-- =========================================================

CREATE TABLE shipper_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL UNIQUE,

    full_name VARCHAR(150) NOT NULL,

    identity_number VARCHAR(50) UNIQUE,

    vehicle_type ENUM(
        'MOTORBIKE',
        'BICYCLE',
        'CAR'
    ) NOT NULL DEFAULT 'MOTORBIKE',

    vehicle_plate VARCHAR(30),

    driving_license VARCHAR(100),

    rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
    total_deliveries INT UNSIGNED NOT NULL DEFAULT 0,

    total_earnings DECIMAL(18,2) NOT NULL DEFAULT 0,

    availability_status ENUM(
        'OFFLINE',
        'AVAILABLE',
        'BUSY',
        'SUSPENDED'
    ) NOT NULL DEFAULT 'OFFLINE',

    current_latitude DECIMAL(10,7),
    current_longitude DECIMAL(10,7),

    last_location_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT chk_shipper_rating
        CHECK (rating BETWEEN 0 AND 5),

    CONSTRAINT fk_shipper_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 19. SHIPPER_DOCUMENTS
-- =========================================================

CREATE TABLE shipper_documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    shipper_id BIGINT UNSIGNED NOT NULL,

    document_type ENUM(
        'IDENTITY_CARD',
        'DRIVING_LICENSE',
        'VEHICLE_REGISTRATION',
        'OTHER'
    ) NOT NULL,

    document_number VARCHAR(100),
    image_url VARCHAR(500),

    verified BOOLEAN NOT NULL DEFAULT FALSE,

    verified_by BIGINT UNSIGNED NULL,
    verified_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_shipper_document_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_shipper_document_verifier
        FOREIGN KEY (verified_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 20. CARTS
-- =========================================================

CREATE TABLE carts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    customer_id BIGINT UNSIGNED NOT NULL,
    restaurant_id BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_customer_restaurant_cart (
        customer_id,
        restaurant_id
    ),

    CONSTRAINT fk_cart_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 21. CART_ITEMS
-- =========================================================

CREATE TABLE cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    cart_id BIGINT UNSIGNED NOT NULL,

    menu_item_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NULL,

    quantity INT UNSIGNED NOT NULL DEFAULT 1,

    unit_price DECIMAL(15,2) NOT NULL,

    note VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_cart_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_cart_price
        CHECK (unit_price >= 0),

    CONSTRAINT fk_cart_item_cart
        FOREIGN KEY (cart_id)
        REFERENCES carts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_item_menu
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_item_variant
        FOREIGN KEY (variant_id)
        REFERENCES menu_item_variants(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 22. CART_ITEM_TOPPINGS
-- =========================================================

CREATE TABLE cart_item_toppings (
    cart_item_id BIGINT UNSIGNED NOT NULL,
    topping_id BIGINT UNSIGNED NOT NULL,

    price DECIMAL(15,2) NOT NULL DEFAULT 0,

    quantity INT UNSIGNED NOT NULL DEFAULT 1,

    PRIMARY KEY (
        cart_item_id,
        topping_id
    ),

    CONSTRAINT chk_cart_topping_price
        CHECK (price >= 0),

    CONSTRAINT chk_cart_topping_quantity
        CHECK (quantity > 0),

    CONSTRAINT fk_cart_topping_item
        FOREIGN KEY (cart_item_id)
        REFERENCES cart_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_topping
        FOREIGN KEY (topping_id)
        REFERENCES toppings(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 23. ORDERS
-- =========================================================

CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_code VARCHAR(50) NOT NULL UNIQUE,

    customer_id BIGINT UNSIGNED NOT NULL,
    restaurant_id BIGINT UNSIGNED NOT NULL,
    shipper_id BIGINT UNSIGNED NULL,

    delivery_address_id BIGINT UNSIGNED NULL,

    receiver_name VARCHAR(150) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,

    delivery_address VARCHAR(500) NOT NULL,

    delivery_latitude DECIMAL(10,7),
    delivery_longitude DECIMAL(10,7),

    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    service_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    payment_method ENUM(
        'COD',
        'BANK_TRANSFER',
        'MOMO',
        'VNPAY',
        'ZALOPAY',
        'CARD',
        'WALLET'
    ) NOT NULL DEFAULT 'COD',

    payment_status ENUM(
        'PENDING',
        'PAID',
        'FAILED',
        'REFUNDED',
        'PARTIALLY_REFUNDED'
    ) NOT NULL DEFAULT 'PENDING',

    order_status ENUM(
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'SHIPPER_ASSIGNED',
        'PICKED_UP',
        'DELIVERING',
        'DELIVERED',
        'CANCELLED',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',

    customer_note VARCHAR(1000),
    restaurant_note VARCHAR(1000),

    ordered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL,
    prepared_at DATETIME NULL,
    picked_up_at DATETIME NULL,
    delivered_at DATETIME NULL,
    cancelled_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT chk_order_subtotal
        CHECK (subtotal >= 0),

    CONSTRAINT chk_order_discount
        CHECK (discount_amount >= 0),

    CONSTRAINT chk_order_delivery_fee
        CHECK (delivery_fee >= 0),

    CONSTRAINT chk_order_service_fee
        CHECK (service_fee >= 0),

    CONSTRAINT chk_order_tax
        CHECK (tax_amount >= 0),

    CONSTRAINT chk_order_total
        CHECK (total_amount >= 0),

    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_order_address
        FOREIGN KEY (delivery_address_id)
        REFERENCES customer_addresses(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 24. ORDER_ITEMS
-- Snapshot tên/giá món để giá đơn cũ không thay đổi.
-- =========================================================

CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,

    menu_item_id BIGINT UNSIGNED NULL,
    variant_id BIGINT UNSIGNED NULL,

    item_name VARCHAR(200) NOT NULL,
    variant_name VARCHAR(100),

    quantity INT UNSIGNED NOT NULL,

    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,

    note VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_order_item_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_order_item_price
        CHECK (unit_price >= 0),

    CONSTRAINT chk_order_item_total
        CHECK (total_price >= 0),

    CONSTRAINT fk_order_item_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_item_menu
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_order_item_variant
        FOREIGN KEY (variant_id)
        REFERENCES menu_item_variants(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 25. ORDER_ITEM_TOPPINGS
-- =========================================================

CREATE TABLE order_item_toppings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_item_id BIGINT UNSIGNED NOT NULL,

    topping_id BIGINT UNSIGNED NULL,

    topping_name VARCHAR(150) NOT NULL,

    price DECIMAL(15,2) NOT NULL DEFAULT 0,

    quantity INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_order_topping_price
        CHECK (price >= 0),

    CONSTRAINT chk_order_topping_quantity
        CHECK (quantity > 0),

    CONSTRAINT fk_order_topping_item
        FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_topping_topping
        FOREIGN KEY (topping_id)
        REFERENCES toppings(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 26. ORDER_STATUS_HISTORY
-- =========================================================

CREATE TABLE order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,

    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,

    changed_by BIGINT UNSIGNED NULL,

    note VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_history_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_history_user
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 27. DELIVERIES
-- =========================================================

CREATE TABLE deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    shipper_id BIGINT UNSIGNED NULL,

    pickup_address VARCHAR(500) NOT NULL,
    delivery_address VARCHAR(500) NOT NULL,

    pickup_latitude DECIMAL(10,7),
    pickup_longitude DECIMAL(10,7),

    delivery_latitude DECIMAL(10,7),
    delivery_longitude DECIMAL(10,7),

    distance_km DECIMAL(10,2) DEFAULT 0,

    delivery_fee DECIMAL(15,2) NOT NULL DEFAULT 0,

    delivery_status ENUM(
        'PENDING',
        'ASSIGNED',
        'ACCEPTED',
        'PICKED_UP',
        'DELIVERING',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    assigned_at DATETIME NULL,
    accepted_at DATETIME NULL,
    picked_up_at DATETIME NULL,
    delivered_at DATETIME NULL,

    proof_image_url VARCHAR(500),
    receiver_signature_url VARCHAR(500),

    delivery_note VARCHAR(1000),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_delivery_distance
        CHECK (distance_km >= 0),

    CONSTRAINT chk_delivery_fee
        CHECK (delivery_fee >= 0),

    CONSTRAINT fk_delivery_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_delivery_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 28. DELIVERY_STATUS_HISTORY
-- =========================================================

CREATE TABLE delivery_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    delivery_id BIGINT UNSIGNED NOT NULL,

    status VARCHAR(50) NOT NULL,

    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    note VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_delivery_history
        FOREIGN KEY (delivery_id)
        REFERENCES deliveries(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 29. SHIPPER_LOCATIONS
-- GPS TRACKING
-- =========================================================

CREATE TABLE shipper_locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    shipper_id BIGINT UNSIGNED NOT NULL,
    delivery_id BIGINT UNSIGNED NULL,

    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,

    speed DECIMAL(8,2) DEFAULT 0,
    heading DECIMAL(6,2) DEFAULT 0,
    accuracy DECIMAL(8,2) NULL,

    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_location_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_location_delivery
        FOREIGN KEY (delivery_id)
        REFERENCES deliveries(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 30. DELIVERY_ASSIGNMENTS
-- =========================================================

CREATE TABLE delivery_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,
    shipper_id BIGINT UNSIGNED NOT NULL,

    assigned_by BIGINT UNSIGNED NULL,

    assignment_status ENUM(
        'OFFERED',
        'ACCEPTED',
        'REJECTED',
        'EXPIRED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'OFFERED',

    offered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME NULL,
    rejected_at DATETIME NULL,
    expired_at DATETIME NULL,

    reject_reason VARCHAR(500),

    CONSTRAINT fk_assignment_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_user
        FOREIGN KEY (assigned_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 31. PAYMENTS
-- =========================================================

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,

    payment_code VARCHAR(100) NOT NULL UNIQUE,

    method ENUM(
        'COD',
        'BANK_TRANSFER',
        'MOMO',
        'VNPAY',
        'ZALOPAY',
        'CARD',
        'WALLET'
    ) NOT NULL,

    amount DECIMAL(15,2) NOT NULL,

    status ENUM(
        'PENDING',
        'PROCESSING',
        'PAID',
        'FAILED',
        'CANCELLED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'PENDING',

    transaction_id VARCHAR(255),
    gateway VARCHAR(100),

    paid_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_payment_amount
        CHECK (amount >= 0),

    CONSTRAINT fk_payment_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 32. PAYMENT_TRANSACTIONS
-- =========================================================

CREATE TABLE payment_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    payment_id BIGINT UNSIGNED NOT NULL,

    transaction_type ENUM(
        'PAYMENT',
        'VERIFY',
        'REFUND',
        'CALLBACK'
    ) NOT NULL,

    request_data JSON NULL,
    response_data JSON NULL,

    status VARCHAR(50),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_transaction_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 33. COD_TRANSACTIONS
-- =========================================================

CREATE TABLE cod_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,
    shipper_id BIGINT UNSIGNED NOT NULL,

    amount DECIMAL(15,2) NOT NULL,

    status ENUM(
        'PENDING',
        'COLLECTED',
        'SETTLED',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',

    collected_at DATETIME NULL,
    settled_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_cod_amount
        CHECK (amount >= 0),

    CONSTRAINT fk_cod_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cod_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- 34. INVOICES
-- =========================================================

CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    invoice_number VARCHAR(100) NOT NULL UNIQUE,

    order_id BIGINT UNSIGNED NOT NULL UNIQUE,

    customer_name VARCHAR(200) NOT NULL,
    restaurant_name VARCHAR(200) NOT NULL,

    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    service_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    total_amount DECIMAL(15,2) NOT NULL,

    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    pdf_url VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_invoice_total
        CHECK (total_amount >= 0),

    CONSTRAINT fk_invoice_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- 35. PROMOTIONS
-- =========================================================

CREATE TABLE promotions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NULL,

    code VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(200) NOT NULL,
    description TEXT,

    discount_type ENUM(
        'PERCENT',
        'FIXED_AMOUNT',
        'FREE_DELIVERY'
    ) NOT NULL,

    discount_value DECIMAL(15,2) NOT NULL,

    max_discount DECIMAL(15,2) NULL,
    minimum_order DECIMAL(15,2) NOT NULL DEFAULT 0,

    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,

    usage_limit INT UNSIGNED NULL,
    usage_per_customer INT UNSIGNED NOT NULL DEFAULT 1,

    used_count INT UNSIGNED NOT NULL DEFAULT 0,

    status ENUM(
        'ACTIVE',
        'INACTIVE',
        'EXPIRED'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT chk_promotion_value
        CHECK (discount_value >= 0),

    CONSTRAINT chk_promotion_min_order
        CHECK (minimum_order >= 0),

    CONSTRAINT chk_promotion_time
        CHECK (end_at > start_at),

    CONSTRAINT fk_promotion_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 36. PROMOTION_USAGE
-- =========================================================

CREATE TABLE promotion_usage (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    promotion_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,

    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_promotion_order (
        promotion_id,
        order_id
    ),

    CONSTRAINT fk_promotion_usage_promotion
        FOREIGN KEY (promotion_id)
        REFERENCES promotions(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_promotion_usage_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_promotion_usage_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 37. RESTAURANT_REVIEWS
-- =========================================================

CREATE TABLE restaurant_reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    restaurant_id BIGINT UNSIGNED NOT NULL,

    rating TINYINT UNSIGNED NOT NULL,

    comment TEXT,

    restaurant_reply TEXT,
    replied_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT chk_restaurant_review_rating
        CHECK (rating BETWEEN 1 AND 5),

    CONSTRAINT fk_review_restaurant_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_restaurant_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 38. SHIPPER_REVIEWS
-- =========================================================

CREATE TABLE shipper_reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    shipper_id BIGINT UNSIGNED NOT NULL,

    rating TINYINT UNSIGNED NOT NULL,

    comment TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    CONSTRAINT chk_shipper_review_rating
        CHECK (rating BETWEEN 1 AND 5),

    CONSTRAINT fk_shipper_review_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_shipper_review_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_shipper_review_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 39. FAVORITE_RESTAURANTS
-- =========================================================

CREATE TABLE favorite_restaurants (
    customer_id BIGINT UNSIGNED NOT NULL,
    restaurant_id BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        customer_id,
        restaurant_id
    ),

    CONSTRAINT fk_favorite_restaurant_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorite_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 40. FAVORITE_MENU_ITEMS
-- =========================================================

CREATE TABLE favorite_menu_items (
    customer_id BIGINT UNSIGNED NOT NULL,
    menu_item_id BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        customer_id,
        menu_item_id
    ),

    CONSTRAINT fk_favorite_menu_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorite_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 41. NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    type ENUM(
        'ORDER',
        'DELIVERY',
        'PAYMENT',
        'PROMOTION',
        'SYSTEM',
        'SUPPORT'
    ) NOT NULL DEFAULT 'SYSTEM',

    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 42. NOTIFICATION_PREFERENCES
-- =========================================================

CREATE TABLE notification_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL UNIQUE,

    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    order_updates BOOLEAN NOT NULL DEFAULT TRUE,
    promotion_updates BOOLEAN NOT NULL DEFAULT TRUE,
    system_updates BOOLEAN NOT NULL DEFAULT TRUE,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_preference
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 43. CHAT_SESSIONS
-- =========================================================

CREATE TABLE chat_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NULL,

    customer_id BIGINT UNSIGNED NULL,
    shipper_id BIGINT UNSIGNED NULL,
    restaurant_id BIGINT UNSIGNED NULL,

    status ENUM(
        'OPEN',
        'CLOSED'
    ) NOT NULL DEFAULT 'OPEN',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,

    CONSTRAINT fk_chat_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chat_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_chat_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_chat_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 44. CHAT_MESSAGES
-- =========================================================

CREATE TABLE chat_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    session_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,

    message TEXT NOT NULL,

    message_type ENUM(
        'TEXT',
        'IMAGE',
        'LOCATION',
        'SYSTEM'
    ) NOT NULL DEFAULT 'TEXT',

    attachment_url VARCHAR(500),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_message_session
        FOREIGN KEY (session_id)
        REFERENCES chat_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chat_message_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 45. SUPPORT_TICKETS
-- =========================================================

CREATE TABLE support_tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_code VARCHAR(50) NOT NULL UNIQUE,

    user_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NULL,

    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    category ENUM(
        'ORDER',
        'PAYMENT',
        'DELIVERY',
        'RESTAURANT',
        'SHIPPER',
        'ACCOUNT',
        'OTHER'
    ) NOT NULL DEFAULT 'OTHER',

    priority ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT'
    ) NOT NULL DEFAULT 'MEDIUM',

    status ENUM(
        'OPEN',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED'
    ) NOT NULL DEFAULT 'OPEN',

    assigned_admin_id BIGINT UNSIGNED NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,

    CONSTRAINT fk_ticket_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ticket_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_ticket_admin
        FOREIGN KEY (assigned_admin_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 46. SUPPORT_MESSAGES
-- =========================================================

CREATE TABLE support_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,

    message TEXT NOT NULL,
    attachment_url VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_support_message_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES support_tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_support_message_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- 47. ORDER_CANCELLATIONS
-- =========================================================

CREATE TABLE order_cancellations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL UNIQUE,

    cancelled_by BIGINT UNSIGNED NULL,

    reason_code ENUM(
        'CUSTOMER_CHANGED_MIND',
        'RESTAURANT_REJECTED',
        'OUT_OF_STOCK',
        'SHIPPER_UNAVAILABLE',
        'PAYMENT_FAILED',
        'SYSTEM_TIMEOUT',
        'OTHER'
    ) NOT NULL,

    reason TEXT,

    refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cancel_refund
        CHECK (refund_amount >= 0),

    CONSTRAINT fk_cancellation_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cancellation_user
        FOREIGN KEY (cancelled_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 48. REFUNDS
-- =========================================================

CREATE TABLE refunds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,
    payment_id BIGINT UNSIGNED NULL,

    amount DECIMAL(15,2) NOT NULL,

    reason TEXT,

    status ENUM(
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'REJECTED'
    ) NOT NULL DEFAULT 'PENDING',

    processed_by BIGINT UNSIGNED NULL,

    transaction_id VARCHAR(255),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,

    CONSTRAINT chk_refund_amount
        CHECK (amount > 0),

    CONSTRAINT fk_refund_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_refund_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_refund_user
        FOREIGN KEY (processed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 49. WALLETS
-- =========================================================

CREATE TABLE wallets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL UNIQUE,

    balance DECIMAL(18,2) NOT NULL DEFAULT 0,

    status ENUM(
        'ACTIVE',
        'LOCKED'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_wallet_balance
        CHECK (balance >= 0),

    CONSTRAINT fk_wallet_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 50. WALLET_TRANSACTIONS
-- =========================================================

CREATE TABLE wallet_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    wallet_id BIGINT UNSIGNED NOT NULL,

    type ENUM(
        'DEPOSIT',
        'PAYMENT',
        'REFUND',
        'EARNING',
        'WITHDRAWAL',
        'ADJUSTMENT'
    ) NOT NULL,

    amount DECIMAL(18,2) NOT NULL,

    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED NULL,

    balance_before DECIMAL(18,2) NOT NULL,
    balance_after DECIMAL(18,2) NOT NULL,

    description VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_wallet_transaction_amount
        CHECK (amount >= 0),

    CONSTRAINT fk_wallet_transaction_wallet
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 51. SHIPPER_EARNINGS
-- =========================================================

CREATE TABLE shipper_earnings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    shipper_id BIGINT UNSIGNED NOT NULL,
    delivery_id BIGINT UNSIGNED NOT NULL UNIQUE,

    delivery_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    bonus DECIMAL(15,2) NOT NULL DEFAULT 0,
    tip_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    platform_fee DECIMAL(15,2) NOT NULL DEFAULT 0,

    net_earning DECIMAL(15,2) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_shipper_earning
        CHECK (net_earning >= 0),

    CONSTRAINT fk_earning_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_earning_delivery
        FOREIGN KEY (delivery_id)
        REFERENCES deliveries(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 52. SHIPPER_WITHDRAWALS
-- =========================================================

CREATE TABLE shipper_withdrawals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    shipper_id BIGINT UNSIGNED NOT NULL,

    amount DECIMAL(15,2) NOT NULL,

    bank_name VARCHAR(150),
    bank_account VARCHAR(100),
    account_holder VARCHAR(150),

    status ENUM(
        'PENDING',
        'APPROVED',
        'COMPLETED',
        'REJECTED'
    ) NOT NULL DEFAULT 'PENDING',

    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,

    processed_by BIGINT UNSIGNED NULL,

    reject_reason VARCHAR(500),

    CONSTRAINT chk_withdraw_amount
        CHECK (amount > 0),

    CONSTRAINT fk_withdraw_shipper
        FOREIGN KEY (shipper_id)
        REFERENCES shipper_profiles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_withdraw_processor
        FOREIGN KEY (processed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 53. RESTAURANT_SETTLEMENTS
-- =========================================================

CREATE TABLE restaurant_settlements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    restaurant_id BIGINT UNSIGNED NOT NULL,

    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    gross_sales DECIMAL(18,2) NOT NULL DEFAULT 0,

    commission_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    refund_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    adjustment_amount DECIMAL(18,2) NOT NULL DEFAULT 0,

    net_amount DECIMAL(18,2) NOT NULL DEFAULT 0,

    status ENUM(
        'PENDING',
        'PROCESSING',
        'SETTLED',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',

    settled_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_settlement_period
        CHECK (period_end >= period_start),

    CONSTRAINT fk_settlement_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- 54. RESTAURANT_COMMISSIONS
-- =========================================================

CREATE TABLE restaurant_commissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    restaurant_id BIGINT UNSIGNED NOT NULL,

    order_amount DECIMAL(15,2) NOT NULL,

    commission_rate DECIMAL(5,2) NOT NULL,

    commission_amount DECIMAL(15,2) NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_commission_rate
        CHECK (commission_rate BETWEEN 0 AND 100),

    CONSTRAINT chk_commission_amount
        CHECK (commission_amount >= 0),

    CONSTRAINT fk_commission_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_commission_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 55. AUDIT_LOGS
-- =========================================================

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,

    old_values JSON NULL,
    new_values JSON NULL,

    ip_address VARCHAR(45),
    user_agent VARCHAR(1000),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 56. REFRESH_TOKENS
-- =========================================================

CREATE TABLE refresh_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    token_hash VARCHAR(500) NOT NULL UNIQUE,

    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_token_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 57. PASSWORD_RESET_TOKENS
-- =========================================================

CREATE TABLE password_reset_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    token_hash VARCHAR(500) NOT NULL UNIQUE,

    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_token_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 58. EMAIL_VERIFICATION_TOKENS
-- =========================================================

CREATE TABLE email_verification_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    token_hash VARCHAR(500) NOT NULL UNIQUE,

    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_verification_token_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 59. LOGIN_HISTORY
-- =========================================================

CREATE TABLE login_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NULL,

    email_attempted VARCHAR(150),

    ip_address VARCHAR(45),
    user_agent VARCHAR(1000),

    success BOOLEAN NOT NULL DEFAULT FALSE,

    logged_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_login_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- 60. IMPORT_JOBS
-- =========================================================

CREATE TABLE import_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    job_type VARCHAR(100) NOT NULL,

    file_url VARCHAR(500) NOT NULL,

    total_rows INT UNSIGNED NOT NULL DEFAULT 0,
    success_rows INT UNSIGNED NOT NULL DEFAULT 0,
    failed_rows INT UNSIGNED NOT NULL DEFAULT 0,

    status ENUM(
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',

    error_log TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,

    CONSTRAINT fk_import_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- 61. EXPORT_JOBS
-- =========================================================

CREATE TABLE export_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    export_type VARCHAR(100) NOT NULL,

    format ENUM(
        'CSV',
        'EXCEL',
        'PDF'
    ) NOT NULL,

    file_url VARCHAR(500),

    status ENUM(
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ) NOT NULL DEFAULT 'PENDING',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,

    CONSTRAINT fk_export_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- =========================================================
-- 62. BACKGROUND_JOBS
-- =========================================================

CREATE TABLE background_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    job_type VARCHAR(100) NOT NULL,

    payload JSON NULL,

    status ENUM(
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    attempts INT UNSIGNED NOT NULL DEFAULT 0,

    error_message TEXT,

    scheduled_at DATETIME NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 63. BANNERS
-- =========================================================

CREATE TABLE banners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    image_url VARCHAR(500) NOT NULL,
    target_url VARCHAR(500),

    start_at DATETIME NULL,
    end_at DATETIME NULL,

    sort_order INT NOT NULL DEFAULT 0,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- 64. SEARCH_HISTORY
-- =========================================================

CREATE TABLE search_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    customer_id BIGINT UNSIGNED NOT NULL,

    keyword VARCHAR(255) NOT NULL,

    searched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_search_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =========================================================
-- 65. DELIVERY_ZONES
-- =========================================================

CREATE TABLE delivery_zones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),

    base_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    price_per_km DECIMAL(15,2) NOT NULL DEFAULT 0,

    minimum_fee DECIMAL(15,2) NOT NULL DEFAULT 0,

    maximum_distance DECIMAL(10,2) NOT NULL DEFAULT 20,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_zone_base_fee
        CHECK (base_fee >= 0),

    CONSTRAINT chk_zone_price_km
        CHECK (price_per_km >= 0),

    CONSTRAINT chk_zone_distance
        CHECK (maximum_distance > 0)
) ENGINE=InnoDB;


-- =========================================================
-- 66. SYSTEM_SETTINGS
-- =========================================================

CREATE TABLE system_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    setting_key VARCHAR(150) NOT NULL UNIQUE,

    setting_value TEXT,

    data_type ENUM(
        'STRING',
        'INTEGER',
        'DECIMAL',
        'BOOLEAN',
        'JSON'
    ) NOT NULL DEFAULT 'STRING',

    description VARCHAR(500),

    updated_by BIGINT UNSIGNED NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_setting_user
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_users_role
ON users(role_id);

CREATE INDEX idx_users_status
ON users(status);

CREATE INDEX idx_users_deleted
ON users(deleted_at);


CREATE INDEX idx_customer_name
ON customer_profiles(full_name);


CREATE INDEX idx_address_customer
ON customer_addresses(customer_id);

CREATE INDEX idx_address_city_district
ON customer_addresses(city, district);


CREATE INDEX idx_restaurant_owner
ON restaurants(owner_user_id);

CREATE INDEX idx_restaurant_category
ON restaurants(category_id);

CREATE INDEX idx_restaurant_name
ON restaurants(name);

CREATE INDEX idx_restaurant_location
ON restaurants(city, district);

CREATE INDEX idx_restaurant_status
ON restaurants(status);

CREATE INDEX idx_restaurant_rating
ON restaurants(rating);


CREATE INDEX idx_menu_restaurant
ON menus(restaurant_id);

CREATE INDEX idx_menu_category_restaurant
ON menu_categories(restaurant_id);

CREATE INDEX idx_menu_item_restaurant
ON menu_items(restaurant_id);

CREATE INDEX idx_menu_item_category
ON menu_items(category_id);

CREATE INDEX idx_menu_item_name
ON menu_items(name);

CREATE INDEX idx_menu_item_available
ON menu_items(is_available);

CREATE INDEX idx_menu_item_featured
ON menu_items(is_featured);


CREATE INDEX idx_shipper_status
ON shipper_profiles(availability_status);

CREATE INDEX idx_shipper_rating
ON shipper_profiles(rating);


CREATE INDEX idx_cart_customer
ON carts(customer_id);

CREATE INDEX idx_cart_item_cart
ON cart_items(cart_id);


CREATE INDEX idx_order_customer
ON orders(customer_id);

CREATE INDEX idx_order_restaurant
ON orders(restaurant_id);

CREATE INDEX idx_order_shipper
ON orders(shipper_id);

CREATE INDEX idx_order_status
ON orders(order_status);

CREATE INDEX idx_order_payment_status
ON orders(payment_status);

CREATE INDEX idx_order_created
ON orders(created_at);

CREATE INDEX idx_order_restaurant_status
ON orders(restaurant_id, order_status);

CREATE INDEX idx_order_customer_created
ON orders(customer_id, created_at);


CREATE INDEX idx_order_item_order
ON order_items(order_id);

CREATE INDEX idx_order_item_menu
ON order_items(menu_item_id);


CREATE INDEX idx_order_history
ON order_status_history(order_id, created_at);


CREATE INDEX idx_delivery_shipper
ON deliveries(shipper_id);

CREATE INDEX idx_delivery_status
ON deliveries(delivery_status);

CREATE INDEX idx_delivery_created
ON deliveries(created_at);


CREATE INDEX idx_shipper_locations_time
ON shipper_locations(shipper_id, recorded_at);

CREATE INDEX idx_delivery_locations
ON shipper_locations(delivery_id, recorded_at);


CREATE INDEX idx_assignment_order
ON delivery_assignments(order_id);

CREATE INDEX idx_assignment_shipper
ON delivery_assignments(shipper_id, assignment_status);


CREATE INDEX idx_payment_order
ON payments(order_id);

CREATE INDEX idx_payment_status
ON payments(status);

CREATE INDEX idx_payment_transaction
ON payments(transaction_id);


CREATE INDEX idx_cod_shipper
ON cod_transactions(shipper_id);

CREATE INDEX idx_cod_status
ON cod_transactions(status);


CREATE INDEX idx_promotion_status_time
ON promotions(status, start_at, end_at);

CREATE INDEX idx_promotion_restaurant
ON promotions(restaurant_id);


CREATE INDEX idx_notification_user_read
ON notifications(user_id, is_read);

CREATE INDEX idx_notification_created
ON notifications(created_at);


CREATE INDEX idx_chat_session_order
ON chat_sessions(order_id);

CREATE INDEX idx_chat_message_session
ON chat_messages(session_id, created_at);


CREATE INDEX idx_ticket_user
ON support_tickets(user_id);

CREATE INDEX idx_ticket_status
ON support_tickets(status);

CREATE INDEX idx_ticket_admin
ON support_tickets(assigned_admin_id);


CREATE INDEX idx_audit_user
ON audit_logs(user_id);

CREATE INDEX idx_audit_entity
ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_created
ON audit_logs(created_at);


CREATE INDEX idx_login_user
ON login_history(user_id);

CREATE INDEX idx_login_date
ON login_history(logged_in_at);


CREATE INDEX idx_search_customer
ON search_history(customer_id, searched_at);


CREATE INDEX idx_restaurant_settlement
ON restaurant_settlements(restaurant_id, period_start, period_end);


-- =========================================================
-- SEED ROLES
-- =========================================================

INSERT INTO roles (
    id,
    name,
    description
)
VALUES
(
    1,
    'ADMIN',
    'Quản trị viên toàn hệ thống'
),
(
    2,
    'RESTAURANT',
    'Chủ hoặc tài khoản nhà hàng'
),
(
    3,
    'SHIPPER',
    'Tài xế giao hàng'
),
(
    4,
    'CUSTOMER',
    'Khách hàng đặt món'
);


-- =========================================================
-- SEED PERMISSIONS
-- =========================================================

INSERT INTO permissions (name, code, description)
VALUES

('Quản lý người dùng',
 'user.manage',
 'Xem, tạo, sửa, khóa tài khoản'),

('Xem người dùng',
 'user.view',
 'Xem danh sách người dùng'),


('Quản lý nhà hàng',
 'restaurant.manage',
 'Quản trị toàn bộ nhà hàng'),

('Xem nhà hàng',
 'restaurant.view',
 'Xem thông tin nhà hàng'),

('Tạo nhà hàng',
 'restaurant.create',
 'Tạo nhà hàng'),

('Cập nhật nhà hàng',
 'restaurant.update',
 'Cập nhật nhà hàng'),


('Xem menu',
 'menu.view',
 'Xem menu và món ăn'),

('Tạo menu',
 'menu.create',
 'Tạo menu và món ăn'),

('Cập nhật menu',
 'menu.update',
 'Sửa menu và món ăn'),

('Xóa menu',
 'menu.delete',
 'Xóa hoặc soft delete món ăn'),


('Xem đơn hàng',
 'order.view',
 'Xem đơn hàng'),

('Tạo đơn hàng',
 'order.create',
 'Đặt món'),

('Cập nhật đơn hàng',
 'order.update',
 'Cập nhật trạng thái đơn'),

('Hủy đơn hàng',
 'order.cancel',
 'Hủy đơn hàng'),


('Xem giao hàng',
 'delivery.view',
 'Xem thông tin giao hàng'),

('Phân công shipper',
 'delivery.assign',
 'Phân công tài xế'),

('Cập nhật giao hàng',
 'delivery.update',
 'Cập nhật trạng thái giao hàng'),

('Xem GPS',
 'delivery.location.view',
 'Xem vị trí shipper'),


('Xem thanh toán',
 'payment.view',
 'Xem giao dịch thanh toán'),

('Quản lý thanh toán',
 'payment.manage',
 'Quản lý thanh toán và hoàn tiền'),


('Xem khuyến mãi',
 'promotion.view',
 'Xem khuyến mãi'),

('Quản lý khuyến mãi',
 'promotion.manage',
 'Tạo, sửa, xóa khuyến mãi'),


('Tạo đánh giá',
 'review.create',
 'Khách hàng đánh giá'),

('Quản lý đánh giá',
 'review.manage',
 'Admin quản lý đánh giá'),


('Xem báo cáo',
 'report.view',
 'Xem dashboard và báo cáo'),

('Xuất báo cáo',
 'report.export',
 'Xuất Excel CSV PDF'),


('Xem audit log',
 'audit.view',
 'Xem lịch sử hệ thống'),


('Tạo hỗ trợ',
 'support.create',
 'Tạo yêu cầu hỗ trợ'),

('Quản lý hỗ trợ',
 'support.manage',
 'Xử lý ticket hỗ trợ'),


('Quản lý hệ thống',
 'system.manage',
 'Quản lý cấu hình hệ thống');


-- =========================================================
-- ADMIN CÓ TOÀN BỘ QUYỀN
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    1,
    id
FROM permissions;


-- =========================================================
-- RESTAURANT PERMISSIONS
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    2,
    id
FROM permissions
WHERE code IN (
    'restaurant.view',
    'restaurant.update',
    'menu.view',
    'menu.create',
    'menu.update',
    'menu.delete',
    'order.view',
    'order.update',
    'delivery.view',
    'promotion.view',
    'promotion.manage',
    'report.view',
    'report.export',
    'support.create'
);


-- =========================================================
-- SHIPPER PERMISSIONS
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    3,
    id
FROM permissions
WHERE code IN (
    'order.view',
    'delivery.view',
    'delivery.update',
    'delivery.location.view',
    'payment.view',
    'support.create'
);


-- =========================================================
-- CUSTOMER PERMISSIONS
-- =========================================================

INSERT INTO role_permissions (
    role_id,
    permission_id
)
SELECT
    4,
    id
FROM permissions
WHERE code IN (
    'restaurant.view',
    'menu.view',
    'order.view',
    'order.create',
    'order.cancel',
    'delivery.view',
    'delivery.location.view',
    'promotion.view',
    'review.create',
    'support.create'
);


-- =========================================================
-- DEFAULT SYSTEM SETTINGS
-- =========================================================

INSERT INTO system_settings (
    setting_key,
    setting_value,
    data_type,
    description
)
VALUES
(
    'delivery_base_fee',
    '15000',
    'DECIMAL',
    'Phí giao hàng cơ bản'
),
(
    'delivery_price_per_km',
    '5000',
    'DECIMAL',
    'Phí giao hàng mỗi km'
),
(
    'platform_commission_rate',
    '15',
    'DECIMAL',
    'Phần trăm hoa hồng mặc định'
),
(
    'tax_rate',
    '0',
    'DECIMAL',
    'Thuế mặc định'
),
(
    'max_delivery_distance',
    '20',
    'DECIMAL',
    'Khoảng cách giao hàng tối đa'
),
(
    'order_cancel_timeout_minutes',
    '5',
    'INTEGER',
    'Thời gian khách có thể hủy đơn'
),
(
    'shipper_location_interval_seconds',
    '10',
    'INTEGER',
    'Chu kỳ gửi GPS shipper'
),
(
    'restaurant_auto_cancel_minutes',
    '10',
    'INTEGER',
    'Tự hủy nếu nhà hàng không xác nhận'
);


-- =========================================================
-- DEFAULT RESTAURANT CATEGORIES
-- =========================================================

INSERT INTO restaurant_categories (
    name,
    description
)
VALUES
('Cơm', 'Các món cơm'),
('Bún - Phở', 'Bún, phở và món nước'),
('Đồ ăn nhanh', 'Fast food'),
('Gà rán', 'Các món gà rán'),
('Pizza', 'Pizza'),
('Trà sữa', 'Trà sữa và topping'),
('Đồ uống', 'Nước uống'),
('Đồ ăn vặt', 'Ăn vặt'),
('Đồ chay', 'Các món chay'),
('Món Việt', 'Ẩm thực Việt Nam');


-- =========================================================
-- DEFAULT DELIVERY ZONES
-- =========================================================

INSERT INTO delivery_zones (
    name,
    city,
    district,
    base_fee,
    price_per_km,
    minimum_fee,
    maximum_distance
)
VALUES
(
    'Khu vực mặc định',
    'Hồ Chí Minh',
    NULL,
    15000,
    5000,
    15000,
    20
);


-- =========================================================
-- VIEWS
-- =========================================================


-- =========================================================
-- VIEW 1: DOANH THU THEO NGÀY
-- =========================================================

CREATE OR REPLACE VIEW vw_daily_revenue AS
SELECT
    DATE(o.delivered_at) AS revenue_date,

    COUNT(o.id) AS completed_orders,

    SUM(o.subtotal) AS food_revenue,

    SUM(o.delivery_fee) AS delivery_revenue,

    SUM(o.service_fee) AS service_revenue,

    SUM(o.discount_amount) AS total_discount,

    SUM(o.total_amount) AS total_revenue

FROM orders o

WHERE
    o.order_status = 'DELIVERED'
    AND o.deleted_at IS NULL

GROUP BY
    DATE(o.delivered_at);


-- =========================================================
-- VIEW 2: DOANH THU NHÀ HÀNG
-- =========================================================

CREATE OR REPLACE VIEW vw_restaurant_revenue AS
SELECT
    r.id AS restaurant_id,

    r.name AS restaurant_name,

    COUNT(o.id) AS completed_orders,

    COALESCE(SUM(o.subtotal), 0) AS gross_food_sales,

    COALESCE(SUM(o.discount_amount), 0) AS total_discount,

    COALESCE(SUM(rc.commission_amount), 0)
        AS platform_commission,

    COALESCE(
        SUM(o.subtotal)
        - SUM(rc.commission_amount),
        0
    ) AS estimated_restaurant_revenue

FROM restaurants r

LEFT JOIN orders o
    ON o.restaurant_id = r.id
    AND o.order_status = 'DELIVERED'

LEFT JOIN restaurant_commissions rc
    ON rc.order_id = o.id

GROUP BY
    r.id,
    r.name;


-- =========================================================
-- VIEW 3: TOP NHÀ HÀNG
-- =========================================================

CREATE OR REPLACE VIEW vw_top_restaurants AS
SELECT
    r.id AS restaurant_id,

    r.name,

    r.rating,

    r.total_reviews,

    COUNT(o.id) AS completed_orders,

    COALESCE(
        SUM(o.total_amount),
        0
    ) AS revenue

FROM restaurants r

LEFT JOIN orders o
    ON o.restaurant_id = r.id
    AND o.order_status = 'DELIVERED'

WHERE
    r.deleted_at IS NULL

GROUP BY
    r.id,
    r.name,
    r.rating,
    r.total_reviews;


-- =========================================================
-- VIEW 4: TOP MÓN ĂN
-- =========================================================

CREATE OR REPLACE VIEW vw_top_menu_items AS
SELECT
    oi.menu_item_id,

    oi.item_name,

    o.restaurant_id,

    r.name AS restaurant_name,

    SUM(oi.quantity) AS quantity_sold,

    SUM(oi.total_price) AS item_revenue

FROM order_items oi

INNER JOIN orders o
    ON o.id = oi.order_id

INNER JOIN restaurants r
    ON r.id = o.restaurant_id

WHERE
    o.order_status = 'DELIVERED'

GROUP BY
    oi.menu_item_id,
    oi.item_name,
    o.restaurant_id,
    r.name;


-- =========================================================
-- VIEW 5: HIỆU SUẤT SHIPPER
-- =========================================================

CREATE OR REPLACE VIEW vw_shipper_performance AS
SELECT
    s.id AS shipper_id,

    s.full_name,

    s.rating,

    s.total_reviews,

    COUNT(
        CASE
            WHEN d.delivery_status = 'DELIVERED'
            THEN 1
        END
    ) AS completed_deliveries,

    COUNT(
        CASE
            WHEN d.delivery_status = 'FAILED'
            THEN 1
        END
    ) AS failed_deliveries,

    ROUND(
        AVG(
            CASE
                WHEN
                    d.picked_up_at IS NOT NULL
                    AND d.delivered_at IS NOT NULL
                THEN
                    TIMESTAMPDIFF(
                        MINUTE,
                        d.picked_up_at,
                        d.delivered_at
                    )
            END
        ),
        2
    ) AS avg_delivery_minutes

FROM shipper_profiles s

LEFT JOIN deliveries d
    ON d.shipper_id = s.id

GROUP BY
    s.id,
    s.full_name,
    s.rating,
    s.total_reviews;


-- =========================================================
-- VIEW 6: THỐNG KÊ ĐƠN HÀNG
-- =========================================================

CREATE OR REPLACE VIEW vw_order_statistics AS
SELECT
    DATE(created_at) AS order_date,

    COUNT(*) AS total_orders,

    SUM(
        CASE
            WHEN order_status = 'DELIVERED'
            THEN 1
            ELSE 0
        END
    ) AS delivered_orders,

    SUM(
        CASE
            WHEN order_status = 'CANCELLED'
            THEN 1
            ELSE 0
        END
    ) AS cancelled_orders,

    SUM(
        CASE
            WHEN order_status = 'FAILED'
            THEN 1
            ELSE 0
        END
    ) AS failed_orders,

    SUM(
        CASE
            WHEN order_status IN (
                'PENDING',
                'CONFIRMED',
                'PREPARING',
                'READY_FOR_PICKUP',
                'SHIPPER_ASSIGNED',
                'PICKED_UP',
                'DELIVERING'
            )
            THEN 1
            ELSE 0
        END
    ) AS processing_orders

FROM orders

WHERE deleted_at IS NULL

GROUP BY
    DATE(created_at);


-- =========================================================
-- VIEW 7: TỶ LỆ GIAO THÀNH CÔNG
-- =========================================================

CREATE OR REPLACE VIEW vw_delivery_success_rate AS
SELECT
    DATE(created_at) AS delivery_date,

    COUNT(*) AS total_deliveries,

    SUM(
        CASE
            WHEN delivery_status = 'DELIVERED'
            THEN 1
            ELSE 0
        END
    ) AS successful_deliveries,

    SUM(
        CASE
            WHEN delivery_status = 'FAILED'
            THEN 1
            ELSE 0
        END
    ) AS failed_deliveries,

    ROUND(
        (
            SUM(
                CASE
                    WHEN delivery_status = 'DELIVERED'
                    THEN 1
                    ELSE 0
                END
            )
            / NULLIF(COUNT(*), 0)
        ) * 100,
        2
    ) AS success_rate_percent

FROM deliveries

GROUP BY
    DATE(created_at);


-- =========================================================
-- VIEW 8: THỐNG KÊ KHÁCH HÀNG
-- =========================================================

CREATE OR REPLACE VIEW vw_customer_order_statistics AS
SELECT
    c.id AS customer_id,

    c.full_name,

    u.email,
    u.phone,

    COUNT(o.id) AS total_orders,

    SUM(
        CASE
            WHEN o.order_status = 'DELIVERED'
            THEN 1
            ELSE 0
        END
    ) AS completed_orders,

    COALESCE(
        SUM(
            CASE
                WHEN o.order_status = 'DELIVERED'
                THEN o.total_amount
                ELSE 0
            END
        ),
        0
    ) AS total_spent,

    MAX(o.created_at) AS last_order_at

FROM customer_profiles c

INNER JOIN users u
    ON u.id = c.user_id

LEFT JOIN orders o
    ON o.customer_id = c.id

GROUP BY
    c.id,
    c.full_name,
    u.email,
    u.phone;


-- =========================================================
-- TRIGGERS
-- =========================================================

DELIMITER $$


-- =========================================================
-- TRIGGER 1
-- TỰ GHI LỊCH SỬ KHI STATUS ORDER THAY ĐỔI
-- =========================================================

CREATE TRIGGER trg_order_status_history
AFTER UPDATE ON orders
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 2
-- KHI ĐƠN DELIVERED -> CẬP NHẬT THỐNG KÊ
-- =========================================================

CREATE TRIGGER trg_order_delivered_statistics
AFTER UPDATE ON orders
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 3
-- CẬP NHẬT SỐ LƯỢNG MÓN ĐÃ BÁN
-- =========================================================

CREATE TRIGGER trg_order_items_sold_count
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN

    IF NEW.menu_item_id IS NOT NULL THEN

        UPDATE menu_items
        SET
            sold_count =
                sold_count + NEW.quantity
        WHERE id = NEW.menu_item_id;

    END IF;

END$$


-- =========================================================
-- TRIGGER 4
-- UPDATE RATING NHÀ HÀNG SAU KHI REVIEW
-- =========================================================

CREATE TRIGGER trg_restaurant_review_insert
AFTER INSERT ON restaurant_reviews
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 5
-- UPDATE RATING NHÀ HÀNG KHI REVIEW THAY ĐỔI
-- =========================================================

CREATE TRIGGER trg_restaurant_review_update
AFTER UPDATE ON restaurant_reviews
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 6
-- UPDATE RATING SHIPPER
-- =========================================================

CREATE TRIGGER trg_shipper_review_insert
AFTER INSERT ON shipper_reviews
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 7
-- UPDATE RATING SHIPPER KHI REVIEW THAY ĐỔI
-- =========================================================

CREATE TRIGGER trg_shipper_review_update
AFTER UPDATE ON shipper_reviews
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 8
-- ĐỒNG BỘ DELIVERY -> ORDER
-- =========================================================

CREATE TRIGGER trg_delivery_status_sync
AFTER UPDATE ON deliveries
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 9
-- KHI SHIPPER ACCEPT ASSIGNMENT
-- =========================================================

CREATE TRIGGER trg_assignment_accept
AFTER UPDATE ON delivery_assignments
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 10
-- CẬP NHẬT VỊ TRÍ HIỆN TẠI SHIPPER
-- =========================================================

CREATE TRIGGER trg_shipper_location_update
AFTER INSERT ON shipper_locations
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 11
-- PAYMENT PAID -> ORDER PAID
-- =========================================================

CREATE TRIGGER trg_payment_paid
AFTER UPDATE ON payments
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 12
-- COD COLLECTED -> PAYMENT STATUS PAID
-- =========================================================

CREATE TRIGGER trg_cod_collected
AFTER UPDATE ON cod_transactions
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 13
-- PROMOTION USAGE COUNTER
-- =========================================================

CREATE TRIGGER trg_promotion_usage_counter
AFTER INSERT ON promotion_usage
FOR EACH ROW
BEGIN

    UPDATE promotions
    SET
        used_count = used_count + 1
    WHERE id = NEW.promotion_id;

END$$


-- =========================================================
-- TRIGGER 14
-- TẠO COMMISSION KHI ĐƠN THÀNH CÔNG
-- =========================================================

CREATE TRIGGER trg_create_restaurant_commission
AFTER UPDATE ON orders
FOR EACH ROW
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

END$$


-- =========================================================
-- TRIGGER 15
-- KHI DELIVERY THÀNH CÔNG -> SHIPPER AVAILABLE
-- =========================================================

CREATE TRIGGER trg_shipper_available_after_delivery
AFTER UPDATE ON deliveries
FOR EACH ROW
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

END$$


DELIMITER ;


-- =========================================================
-- KIỂM TRA SỐ LƯỢNG TABLE
-- =========================================================

SELECT
    COUNT(*) AS total_tables
FROM information_schema.tables
WHERE
    table_schema = 'food_delivery_db'
    AND table_type = 'BASE TABLE';


-- =========================================================
-- DANH SÁCH TABLE
-- =========================================================

SHOW TABLES;


-- =========================================================
-- DANH SÁCH VIEW
-- =========================================================

SELECT
    TABLE_NAME
FROM information_schema.views
WHERE
    table_schema = 'food_delivery_db';