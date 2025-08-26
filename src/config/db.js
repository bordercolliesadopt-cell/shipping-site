const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const DatabaseAdapter = require('./db-adapter');

let pool;
let adapter;

async function ensureDatabase() {
	const host = process.env.DB_HOST || 'localhost';
	const port = Number(process.env.DB_PORT || 3306);
	const user = process.env.DB_USER || 'root';
	const password = process.env.DB_PASSWORD || '';
	const database = process.env.DB_NAME || 'emilash_shipping';
	try {
		const conn = await mysql.createConnection({ host, port, user, password });
		try {
			await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
		} finally {
			await conn.end();
		}
	} catch (e) {
		console.warn('ensureDatabase: skipped (likely no privilege on remote):', e && e.code ? e.code : e.message);
	}
}

function getPool() {
	if (!adapter) {
		pool = mysql.createPool({
			host: process.env.DB_HOST || 'localhost',
			port: Number(process.env.DB_PORT || 3306),
			user: process.env.DB_USER || 'root',
			password: process.env.DB_PASSWORD || '',
			database: process.env.DB_NAME || 'emilash_shipping',
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0,
		});
		
		adapter = new DatabaseAdapter(pool, false); // false = isMySQL
	}
	return adapter;
}

async function runMigrations() {
	const initSqlPath = path.join(__dirname, '..', 'migrations', 'init.sql');
	const sql = fs.readFileSync(initSqlPath, 'utf8');
	const conn = await pool.getConnection();
	try {
		await conn.query('SET FOREIGN_KEY_CHECKS = 1');
		const statements = sql
			.split(/;\s*[\r\n]/)
			.map(s => s.trim())
			.filter(Boolean);
		for (const stmt of statements) {
			if (stmt.length > 0) {
				console.log('Executing SQL statement:', stmt.substring(0, 100) + '...');
				try {
					await conn.query(stmt);
				} catch (error) {
					console.error('Error executing statement:', error.message);
					console.error('Statement:', stmt.substring(0, 200) + '...');
					throw error;
				}
			}
		}
	} finally {
		conn.release();
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

module.exports = { getPool, runMigrations, ensureDefaultAdmin, ensureDatabase };
