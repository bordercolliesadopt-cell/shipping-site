# Emilash Logistics Admin Panel

A Node.js + Express admin panel for managing shipments, statuses, and global settings with a MySQL backend.

## Features
- Admin authentication (login/logout)
- Shipments CRUD with status history
- Statuses CRUD (name, color, order, terminal)
- Settings module: company/site info and SMTP configuration
- SMTP test email action
- Responsive EJS + Bootstrap UI

## Requirements
- Node.js 18+
- MySQL 8.x

## Quick Start
1. Install dependencies:
   - `npm install`
2. Create `.env` in the project root (example below).
3. Start the server:
   - Dev: `npm run dev`
   - Prod: `npm start`
4. Open `http://localhost:3000/admin/login`
   - Default admin (seeded): `admin@emilash.local` / `admin123`

## .env example
```
PORT=3000
SESSION_SECRET=change_this_secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=emilash_shipping

COMPANY_NAME=Emilash Logistics
COMPANY_EMAIL=support@example.com
COMPANY_PHONE=+1-555-555-5555
COMPANY_ADDRESS=123 Logistics Ave, City, Country
TIMEZONE=UTC
SITE_BASE_URL=http://localhost:3000

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="Emilash Logistics" <no-reply@example.com>
```

## Using Hostinger Remote MySQL
If your MySQL is hosted on Hostinger:
- Host: `srv1540.hstgr.io` (or `82.197.82.47`)
- Database: `emileshipping`
- User: `emileshipping`
- Password: set by you

Steps:
1. Log in to Hostinger hPanel → Databases → Remote MySQL.
2. Add your public IP address to the allowlist for user/database `emileshipping`.
   - The server logs showed a blocked IP as an example: `143.105.152.229`. Use your current public IP.
3. Ensure the MySQL user `emileshipping` has privileges on `emileshipping`.
4. Set `.env` accordingly:
```
DB_HOST=82.197.82.47
DB_PORT=3306
DB_USER=emileshipping
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=emileshipping
```
5. Start the server: `npm run dev`.

Note: On some hosts, `CREATE DATABASE` is not allowed remotely; the app handles this gracefully and proceeds to run migrations within the selected database.

## Database Migrations & Seeding
- On startup, the app runs `src/migrations/init.sql`.
- It seeds default statuses and an admin user if not present.

## Tech Stack
- Express 5, EJS, ejs-mate
- MySQL (mysql2/promise)
- express-session, connect-flash
- express-validator, method-override
- nodemailer
- Bootstrap 5

## Folder Structure
- `src/server.js` – app bootstrap and middleware
- `src/config/` – env and DB setup
- `src/migrations/` – SQL schema and seed data
- `src/routes/` – admin routes
- `src/controllers/` – modules: auth, dashboard, shipments, statuses, settings
- `src/views/` – EJS templates
- `src/public/` – CSS/assets

## Admin Panel Features ✨

### 🎯 Complete Feature Set
- **📊 Dashboard**: Analytics with shipment stats, recent activity, and quick actions
- **📦 Shipments**: Full CRUD with search/filtering by status, priority, service type
- **🏷️ Statuses**: 15+ comprehensive shipping statuses with colors and descriptions
- **👥 User Management**: Create/edit admin and staff users with role-based access
- **⚙️ Settings**: Company info, SMTP configuration, and system settings
- **🔐 Authentication**: Secure login/logout with session management

### 🎨 Modern UI/UX
- Responsive design with Bootstrap 5
- Gradient color schemes and smooth animations
- Intuitive icons and visual hierarchy
- Mobile-optimized interface
- Real-time search and filtering

### 📋 Enhanced Shipment Management
- **Advanced Fields**: Service type, priority, package dimensions, value, special instructions
- **Smart Search**: Filter by tracking number, sender, receiver, status, priority, service
- **Status History**: Complete audit trail with timestamps and user tracking
- **Rich Forms**: Card-based layouts with validation and helpful placeholders

### 🔧 System Administration
- **User Roles**: Admin (full access) vs Staff (limited access)
- **SMTP Testing**: Built-in email configuration testing
- **Database Auto-Setup**: Automatic migrations and default data seeding
- **Audit Logging**: Track all changes (ready for implementation)

## Next Steps 🚀
- **📱 Public Tracking**: Customer-facing tracking page using `/img` assets
- **📧 Email Notifications**: Automatic status update emails to customers
- **📊 Advanced Analytics**: Charts and reporting dashboard
- **📤 Export Features**: CSV/Excel export functionality
- **🔍 Advanced Search**: Full-text search across all shipment fields
