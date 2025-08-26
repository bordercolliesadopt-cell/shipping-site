CREATE TABLE IF NOT EXISTS users (
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(120) NOT NULL,
	email VARCHAR(190) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	role ENUM('admin','staff') NOT NULL DEFAULT 'admin',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS statuses (
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	color VARCHAR(20) NOT NULL DEFAULT '#6c757d',
	position INT NOT NULL DEFAULT 0,
	is_terminal TINYINT(1) NOT NULL DEFAULT 0,
	description TEXT NULL,
	is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS shipments (
	id INT AUTO_INCREMENT PRIMARY KEY,
	tracking_number VARCHAR(40) NOT NULL UNIQUE,
	sender_name VARCHAR(150) NOT NULL,
	sender_email VARCHAR(190) NULL,
	sender_phone VARCHAR(60) NULL,
	sender_address TEXT NULL,
	receiver_name VARCHAR(150) NOT NULL,
	receiver_email VARCHAR(190) NULL,
	receiver_phone VARCHAR(60) NULL,
	receiver_address TEXT NULL,
	origin VARCHAR(150) NULL,
	destination VARCHAR(150) NULL,
	current_location VARCHAR(150) NULL,
	current_lat DECIMAL(10,7) NULL,
	current_lng DECIMAL(10,7) NULL,
	sender_lat DECIMAL(10,7) NULL,
	sender_lng DECIMAL(10,7) NULL,
	receiver_lat DECIMAL(10,7) NULL,
	receiver_lng DECIMAL(10,7) NULL,
	package_description TEXT NULL,
	package_type ENUM('general','documents','fragile','hazardous','live_animal','perishable','electronics','clothing','automotive','pharmaceutical') DEFAULT 'general',
	package_weight DECIMAL(10,2) NULL,
	package_dimensions VARCHAR(100) NULL,
	package_value DECIMAL(10,2) NULL,
	animal_species VARCHAR(100) NULL,
	animal_health_certificate TINYINT(1) DEFAULT 0,
	temperature_controlled TINYINT(1) DEFAULT 0,
	special_handling_required TINYINT(1) DEFAULT 0,
	service_type ENUM('standard','express','overnight','freight','live_animal','air_freight','sea_freight','land_freight') DEFAULT 'standard',
	eta DATETIME NULL,
	current_status_id INT NULL,
	priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
	special_instructions TEXT NULL,
	created_by INT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (current_status_id) REFERENCES statuses(id) ON DELETE SET NULL,
	FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS status_history (
	id INT AUTO_INCREMENT PRIMARY KEY,
	shipment_id INT NOT NULL,
	status_id INT NOT NULL,
	note VARCHAR(255) NULL,
	location VARCHAR(150) NULL,
	changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	changed_by INT NULL,
	FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
	FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE CASCADE,
	FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
	id INT AUTO_INCREMENT PRIMARY KEY,
	`key` VARCHAR(190) NOT NULL UNIQUE,
	`value` TEXT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NULL,
	action VARCHAR(100) NOT NULL,
	table_name VARCHAR(100) NOT NULL,
	record_id INT NULL,
	old_values JSON NULL,
	new_values JSON NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NULL,
	title VARCHAR(255) NOT NULL,
	message TEXT NOT NULL,
	type ENUM('info','success','warning','error') DEFAULT 'info',
	is_read TINYINT(1) DEFAULT 0,
	action_url VARCHAR(500) NULL,
	icon VARCHAR(50) NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	read_at TIMESTAMP NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add missing columns to existing tables if they don't exist
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_type ENUM('general','documents','fragile','hazardous','live_animal','perishable','electronics','clothing','automotive','pharmaceutical') DEFAULT 'general';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS animal_species VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS animal_health_certificate TINYINT(1) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS temperature_controlled TINYINT(1) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS special_handling_required TINYINT(1) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS service_type ENUM('standard','express','overnight','freight','live_animal','air_freight','sea_freight','land_freight') DEFAULT 'standard';
-- Sender extensions
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_address TEXT NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_company VARCHAR(150) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_city VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_state VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_postal_code VARCHAR(20) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_country VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_alt_phone VARCHAR(60) NULL;
-- Receiver extensions
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_address TEXT NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_company VARCHAR(150) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_city VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_state VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_postal_code VARCHAR(20) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_country VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_alt_phone VARCHAR(60) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_location VARCHAR(150) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10,7) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_lng DECIMAL(10,7) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_lat DECIMAL(10,7) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_lng DECIMAL(10,7) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_lat DECIMAL(10,7) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_lng DECIMAL(10,7) NULL;
-- Package extensions
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_quantity INT NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_length DECIMAL(10,2) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_width DECIMAL(10,2) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_height DECIMAL(10,2) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_dimensions VARCHAR(100) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance_required TINYINT(1) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance_value DECIMAL(10,2) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS declared_currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS hs_code VARCHAR(20) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS dangerous_goods TINYINT(1) DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS un_number VARCHAR(10) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS temperature_min DECIMAL(5,2) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS temperature_max DECIMAL(5,2) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS incoterms ENUM('EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF') DEFAULT 'DAP';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_date DATETIME NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS delivery_window_start DATETIME NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS delivery_window_end DATETIME NULL;

-- Additional fields for enhanced forms
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_unit VARCHAR(50) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_unit VARCHAR(50) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS hazard_class VARCHAR(50) NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS animal_care_notes TEXT NULL;

-- Update service_type ENUM to include new freight options
ALTER TABLE shipments MODIFY COLUMN service_type ENUM('standard','express','overnight','freight','live_animal','air_freight','sea_freight','land_freight') DEFAULT 'standard';

-- Enhanced statuses with better workflow
DELETE FROM statuses;

-- Insert definitive set of permanent and temporary statuses
INSERT INTO statuses (id, name, color, position, is_terminal, description, is_active) VALUES
	-- Permanent backbone (1..7 in order)
	(1, 'Registered', '#6c757d', 1, 0, 'Shipment registered; information received', 1),
	(2, 'Picked Up', '#17a2b8', 2, 0, 'Package collected from sender', 1),
	(3, 'Loaded for Transportation', '#0dcaf0', 3, 0, 'Loaded onto transport vehicle/aircraft/vessel', 1),
	(4, 'In Transit', '#0d6efd', 4, 0, 'Package is on its way to destination', 1),
	(5, 'Arrived at State/City', '#6610f2', 5, 0, 'Arrived at hub/state/city near destination', 1),
	(6, 'Out for Delivery', '#fd7e14', 6, 0, 'Package is out for final delivery', 1),
	(7, 'Delivered', '#198754', 7, 1, 'Package successfully delivered', 1),
	-- Temporary statuses (position 0, non-permanent)
	(11, 'On Hold', '#ffc107', 0, 0, 'Temporary hold with reason', 1),
	(12, 'Delayed', '#ffca2c', 0, 0, 'Shipment delayed; see note for reason', 1),
	(13, 'Pending Clearance', '#ffc107', 0, 0, 'Awaiting customs/administrative clearance', 1),
	(14, 'Pending Reschedule', '#ffc107', 0, 0, 'Awaiting delivery reschedule', 1),
	(15, 'Hold for Pickup', '#0dcaf0', 0, 0, 'Held at facility for customer pickup', 1),
	(16, 'Under Investigation', '#dc3545', 0, 0, 'Issue under investigation', 1);

-- Keep only core statuses active; all others deactivated (can be used as temporary flags via history)
-- Minimal set already inserted; no further updates required

-- Default settings keys
INSERT IGNORE INTO settings (`key`, `value`) VALUES
	('COMPANY_NAME', 'Emilash Logistics'),
	('COMPANY_EMAIL', 'support@emilashlogistics.com'),
	('COMPANY_PHONE', '+1-555-EMILASH'),
	('COMPANY_ADDRESS', '123 Logistics Avenue, Shipping District, City 12345'),
	('COMPANY_WEBSITE', 'https://emilashlogistics.com'),
	('TIMEZONE', 'UTC'),
	('SITE_BASE_URL', 'http://localhost:3000'),
	('SMTP_HOST', ''),
	('SMTP_PORT', '587'),
	('SMTP_USER', ''),
	('SMTP_PASSWORD', ''),
	('SMTP_FROM', '"Emilash Logistics" <no-reply@emilashlogistics.com>'),
	('EMAIL_NOTIFICATIONS', '1'),
	('AUTO_TRACKING_UPDATES', '1'),
	('DEFAULT_SERVICE_TYPE', 'standard'),
	('CURRENCY', 'USD'),
	('NOTIFY_SHIPMENT_CREATED', '1'),
	('NOTIFY_STATUS_CHANGED', '1'),
	('NOTIFY_DELIVERED', '1'),
	('NOTIFY_EXCEPTIONS', '1'),
	('ADMIN_DAILY_SUMMARY', '1'),
	('ADMIN_SYSTEM_ALERTS', '1');

-- Sample notifications
INSERT IGNORE INTO notifications (id, user_id, title, message, type, action_url, icon, created_at) VALUES
	(1, NULL, 'Welcome to Emilash Logistics!', 'Your shipping management system is ready to use. Configure your settings to get started.', 'success', '/admin/settings', 'bi-gear', NOW() - INTERVAL 1 HOUR),
	(2, NULL, 'New Shipment Created', 'A new shipment has been created and is awaiting processing.', 'info', '/admin/shipments', 'bi-box-seam', NOW() - INTERVAL 2 HOUR),
	(3, NULL, 'Database Backup Recommended', 'It has been 7 days since your last database backup. Consider creating a backup for data safety.', 'warning', '/admin/settings', 'bi-cloud-download', NOW() - INTERVAL 3 HOUR),
	(4, NULL, 'Email Configuration Required', 'SMTP settings are not configured. Set up email notifications to keep customers informed.', 'warning', '/admin/settings', 'bi-envelope-gear', NOW() - INTERVAL 5 HOUR),
	(5, NULL, 'System Update Available', 'A new version of the shipping system is available with enhanced features and security updates.', 'info', '/admin/settings', 'bi-arrow-up-circle', NOW() - INTERVAL 1 DAY);

-- Seed a temporary example shipment (for testing UI); will not duplicate due to unique tracking number
INSERT IGNORE INTO shipments (
    tracking_number, sender_name, receiver_name, origin, destination, package_description, package_weight, service_type, priority, current_status_id,
    sender_address, sender_city, sender_state, sender_country, sender_lat, sender_lng,
    receiver_address, receiver_city, receiver_state, receiver_country, receiver_lat, receiver_lng,
    current_location, current_lat, current_lng
) VALUES (
    CONCAT('TEMP-', DATE_FORMAT(NOW(), '%y%m%d'), '-ABC1'),
    'Test Sender',
    'Test Receiver',
    'New York, NY',
    'Los Angeles, CA',
    'Small test package',
    0.68,
    'standard',
    'normal',
    4,
    '123 Broadway, New York, NY 10001',
    'New York',
    'NY',
    'US',
    40.7589,
    -73.9851,
    '456 Hollywood Blvd, Los Angeles, CA 90028',
    'Los Angeles',
    'CA', 
    'US',
    34.0928,
    -118.3287,
    'Kansas City, MO',
    39.0997,
    -94.5786
);

-- Additional seeded shipments for demo
INSERT IGNORE INTO shipments (
    tracking_number, sender_name, receiver_name, origin, destination, package_description, package_weight, service_type, priority, current_status_id,
    sender_address, sender_city, sender_state, sender_country, sender_lat, sender_lng,
    receiver_address, receiver_city, receiver_state, receiver_country, receiver_lat, receiver_lng,
    current_location, current_lat, current_lng
) VALUES
    (CONCAT('TEMP-', DATE_FORMAT(NOW(), '%y%m%d'), '-DEF2'), 'Acme Inc', 'John Smith', 'Austin, TX', 'Miami, FL', 'Documents', 0.45, 'express', 'high', 2,
     '100 Congress Ave, Austin, TX 78701', 'Austin', 'TX', 'US', 30.2672, -97.7431,
     '200 Biscayne Blvd, Miami, FL 33131', 'Miami', 'FL', 'US', 25.7617, -80.1918,
     'Houston, TX', 29.7604, -95.3698),
    (CONCAT('TEMP-', DATE_FORMAT(NOW(), '%y%m%d'), '-GHI3'), 'Global Ltd', 'Jane Doe', 'Seattle, WA', 'Chicago, IL', 'Electronics', 2.70, 'standard', 'normal', 4,
     '400 Pine St, Seattle, WA 98101', 'Seattle', 'WA', 'US', 47.6062, -122.3321,
     '233 S Wacker Dr, Chicago, IL 60606', 'Chicago', 'IL', 'US', 41.8781, -87.6298,
     'Denver, CO', 39.7392, -104.9903);
