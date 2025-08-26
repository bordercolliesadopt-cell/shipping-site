const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const DatabaseAdapter = require('./db-adapter');

let pool;
let adapter;

function getPool() {
	if (!adapter) {
		// Use DATABASE_URL from Render or build connection string from parts
		let connectionConfig;
		
		if (process.env.DATABASE_URL) {
			connectionConfig = {
				connectionString: process.env.DATABASE_URL,
				ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
			};
		} else {
			// Fallback to individual environment variables
			connectionConfig = {
				host: process.env.DB_HOST || 'localhost',
				port: Number(process.env.DB_PORT || 5432),
				user: process.env.DB_USER || 'postgres',
				password: process.env.DB_PASSWORD || '',
				database: process.env.DB_NAME || 'emilash_shipping',
				ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
			};
		}
		
		pool = new Pool(connectionConfig);
		adapter = new DatabaseAdapter(pool, true); // true = isPostgres
	}
	return adapter;
}

async function runMigrations() {
	const initSqlPath = path.join(__dirname, '..', 'migrations', 'init-postgres.sql');
	const sql = fs.readFileSync(initSqlPath, 'utf8');
	
	// Ensure pool is initialized
	if (!pool) {
		getPool(); // This initializes the pool
	}
	
	console.log('Attempting to connect to PostgreSQL database...');
	console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
	console.log('DB_HOST:', process.env.DB_HOST || 'not set');
	
	const client = await pool.connect();
	try {
		const statements = sql
			.split(/;\s*[\r\n]/)
			.map(s => s.trim())
			.filter(Boolean);
		for (const stmt of statements) {
			if (stmt.length > 0) {
				console.log('Executing SQL statement:', stmt.substring(0, 100) + '...');
				try {
					await client.query(stmt);
				} catch (error) {
					console.error('Error executing statement:', error.message);
					console.error('Statement:', stmt.substring(0, 200) + '...');
					throw error;
				}
			}
		}
	} finally {
		client.release();
	}
}

async function ensureDefaultAdmin() {
	const [rows] = await getPool().query('SELECT id FROM users WHERE email = ?', ['admin@emilash.local']);
	if (rows.length === 0) {
		const passwordHash = await bcrypt.hash('admin123', 10);
		await getPool().query(
			'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
			['Administrator', 'admin@emilash.local', passwordHash, 'admin']
		);
		console.log('Seeded default admin: admin@emilash.local / admin123');
	}
}

// PostgreSQL doesn't need explicit database creation like MySQL
async function ensureDatabase() {
	// No-op for PostgreSQL as database is created by Render
	console.log('Database connection will be handled by PostgreSQL pool');
}

module.exports = { getPool, runMigrations, ensureDefaultAdmin, ensureDatabase };
