-- PostgreSQL version of the schema
CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	name VARCHAR(120) NOT NULL,
	email VARCHAR(190) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','staff')),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS statuses (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	color VARCHAR(20) NOT NULL DEFAULT '#6c757d',
	position INTEGER NOT NULL DEFAULT 0,
	is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
	description TEXT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS shipments (
	id SERIAL PRIMARY KEY,
	tracking_number VARCHAR(40) NOT NULL UNIQUE,
	sender_name VARCHAR(150) NOT NULL,
	sender_email VARCHAR(190),
	sender_phone VARCHAR(60),
	sender_address TEXT,
	receiver_name VARCHAR(150) NOT NULL,
	receiver_email VARCHAR(190),
	receiver_phone VARCHAR(60),
	receiver_address TEXT,
	origin VARCHAR(150),
	destination VARCHAR(150),
	current_location VARCHAR(150),
	current_lat DECIMAL(10,7),
	current_lng DECIMAL(10,7),
	sender_lat DECIMAL(10,7),
	sender_lng DECIMAL(10,7),
	receiver_lat DECIMAL(10,7),
	receiver_lng DECIMAL(10,7),
	package_description TEXT,
	package_type VARCHAR(50) DEFAULT 'general' CHECK (package_type IN ('general','documents','fragile','hazardous','live_animal','perishable','electronics','clothing','automotive','pharmaceutical')),
	package_weight DECIMAL(10,2),
	package_dimensions VARCHAR(100),
	package_value DECIMAL(10,2),
	animal_species VARCHAR(100),
	animal_health_certificate BOOLEAN DEFAULT FALSE,
	temperature_controlled BOOLEAN DEFAULT FALSE,
	special_handling_required BOOLEAN DEFAULT FALSE,
	service_type VARCHAR(50) DEFAULT 'standard' CHECK (service_type IN ('standard','express','overnight','freight','live_animal','air_freight','sea_freight','land_freight')),
	eta TIMESTAMP,
	current_status_id INTEGER,
	priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
	special_instructions TEXT,
	created_by INTEGER,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (current_status_id) REFERENCES statuses(id) ON DELETE SET NULL,
	FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS status_history (
	id SERIAL PRIMARY KEY,
	shipment_id INTEGER NOT NULL,
	status_id INTEGER NOT NULL,
	note VARCHAR(255),
	location VARCHAR(150),
	changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	changed_by INTEGER,
	FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
	FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE CASCADE,
	FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
	id SERIAL PRIMARY KEY,
	key VARCHAR(190) NOT NULL UNIQUE,
	value TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id SERIAL PRIMARY KEY,
	user_id INTEGER,
	action VARCHAR(100) NOT NULL,
	table_name VARCHAR(100) NOT NULL,
	record_id INTEGER,
	old_values JSONB,
	new_values JSONB,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
	id SERIAL PRIMARY KEY,
	user_id INTEGER,
	title VARCHAR(255) NOT NULL,
	message TEXT NOT NULL,
	type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
	is_read BOOLEAN DEFAULT FALSE,
	action_url VARCHAR(500),
	icon VARCHAR(50),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	read_at TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add columns if they don't exist (PostgreSQL doesn't have ADD COLUMN IF NOT EXISTS, so we'll handle this differently)
-- We'll use DO blocks to conditionally add columns

-- Enhanced statuses with better workflow
INSERT INTO statuses (id, name, color, position, is_terminal, description, is_active) VALUES
	-- Permanent backbone (1..7 in order)
	(1, 'Registered', '#6c757d', 1, FALSE, 'Shipment registered; information received', TRUE),
	(2, 'Picked Up', '#17a2b8', 2, FALSE, 'Package collected from sender', TRUE),
	(3, 'Loaded for Transportation', '#0dcaf0', 3, FALSE, 'Loaded onto transport vehicle/aircraft/vessel', TRUE),
	(4, 'In Transit', '#0d6efd', 4, FALSE, 'Package is on its way to destination', TRUE),
	(5, 'Arrived at State/City', '#6610f2', 5, FALSE, 'Arrived at hub/state/city near destination', TRUE),
	(6, 'Out for Delivery', '#fd7e14', 6, FALSE, 'Package is out for final delivery', TRUE),
	(7, 'Delivered', '#198754', 7, TRUE, 'Package successfully delivered', TRUE),
	-- Temporary statuses (position 0, non-permanent)
	(11, 'On Hold', '#ffc107', 0, FALSE, 'Temporary hold with reason', TRUE),
	(12, 'Delayed', '#ffca2c', 0, FALSE, 'Shipment delayed; see note for reason', TRUE),
	(13, 'Pending Clearance', '#ffc107', 0, FALSE, 'Awaiting customs/administrative clearance', TRUE),
	(14, 'Pending Reschedule', '#ffc107', 0, FALSE, 'Awaiting delivery reschedule', TRUE),
	(15, 'Hold for Pickup', '#0dcaf0', 0, FALSE, 'Held at facility for customer pickup', TRUE),
	(16, 'Under Investigation', '#dc3545', 0, FALSE, 'Issue under investigation', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Update sequence for statuses
SELECT setval('statuses_id_seq', (SELECT MAX(id) FROM statuses));

-- Default settings keys
INSERT INTO settings (key, value) VALUES
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
	('ADMIN_SYSTEM_ALERTS', '1')
ON CONFLICT (key) DO NOTHING;

-- Sample notifications
INSERT INTO notifications (id, user_id, title, message, type, action_url, icon, created_at) VALUES
	(1, NULL, 'Welcome to Emilash Logistics!', 'Your shipping management system is ready to use. Configure your settings to get started.', 'success', '/admin/settings', 'bi-gear', NOW() - INTERVAL '1 hour'),
	(2, NULL, 'New Shipment Created', 'A new shipment has been created and is awaiting processing.', 'info', '/admin/shipments', 'bi-box-seam', NOW() - INTERVAL '2 hours'),
	(3, NULL, 'Database Backup Recommended', 'It has been 7 days since your last database backup. Consider data safety.', 'warning', '/admin/settings', 'bi-cloud-download', NOW() - INTERVAL '3 hours'),
	(4, NULL, 'Email Configuration Required', 'SMTP settings are not configured. Set up email notifications.', 'warning', '/admin/settings', 'bi-envelope-gear', NOW() - INTERVAL '5 hours'),
	(5, NULL, 'System Update Available', 'A new version is available with enhanced features.', 'info', '/admin/settings', 'bi-arrow-up-circle', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Update sequence for notifications
SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications));

-- Seed a temporary example shipment (for testing UI)
INSERT INTO shipments (
    tracking_number, sender_name, receiver_name, origin, destination, package_description, package_weight, service_type, priority, current_status_id,
    sender_address, current_location
) VALUES (
    'TEMP-' || TO_CHAR(NOW(), 'YYMMDD') || '-ABC1',
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
    'Kansas City, MO'
) ON CONFLICT (tracking_number) DO NOTHING;

-- Additional seeded shipments for demo
INSERT INTO shipments (
    tracking_number, sender_name, receiver_name, origin, destination, package_description, package_weight, service_type, priority, current_status_id,
    sender_address, current_location
) VALUES
    ('TEMP-' || TO_CHAR(NOW(), 'YYMMDD') || '-DEF2', 'Acme Inc', 'John Smith', 'Austin, TX', 'Miami, FL', 'Documents', 0.45, 'express', 'high', 2,
     '100 Congress Ave, Austin, TX 78701', 'Houston, TX'),
    ('TEMP-' || TO_CHAR(NOW(), 'YYMMDD') || '-GHI3', 'Global Ltd', 'Jane Doe', 'Seattle, WA', 'Chicago, IL', 'Electronics', 2.70, 'standard', 'normal', 4,
     '400 Pine St, Seattle, WA 98101', 'Denver, CO')
ON CONFLICT (tracking_number) DO NOTHING;
