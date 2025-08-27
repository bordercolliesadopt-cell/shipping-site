const dbConfig = (process.env.DATABASE_URL || process.env.NODE_ENV === 'production')
	? require('../config/db-postgres')
	: require('../config/db');
const { getPool, isPostgres } = dbConfig;
const nodemailer = require('nodemailer');

async function getAllSettingsMap() {
	try {
		const [rows] = await getPool().query('SELECT key, value FROM settings');
		const map = {};
		if (rows && Array.isArray(rows)) {
			rows.forEach(r => (map[r.key] = r.value));
		}
		return map;
	} catch (error) {
		console.error('Error fetching settings from database:', error);
		return {};
	}
}

module.exports = {
	index: async (req, res) => {
		try {
			const settings = await getAllSettingsMap();
			console.log('Settings loaded:', settings); // Debug log
			res.render('settings/index', {
				title: 'Settings',
				appSettings: settings || {}
			});
		} catch (error) {
			console.error('Error loading settings:', error);
			req.flash('error', 'Failed to load settings');
			res.render('settings/index', {
				title: 'Settings',
				appSettings: {}
			});
		}
	},
	update: async (req, res) => {
		const data = req.body || {};
		const entries = Object.entries(data);
		const adapter = getPool();
		const conn = await adapter.getConnection();
		try {
			if (isPostgres) {
				await conn.query('BEGIN');
			} else {
				await conn.beginTransaction();
			}
			for (const [key, value] of entries) {
				const sql = isPostgres
					? 'INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'
					: 'INSERT INTO settings(`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)';
				if (isPostgres) {
					const { query, params } = adapter.convertQuery(sql, [key, value]);
					await conn.query(query, params);
				} else {
					await conn.query(sql, [key, value]);
				}
			}
			if (isPostgres) {
				await conn.query('COMMIT');
			} else {
				await conn.commit();
			}
			req.flash('success', 'Settings updated');
		} catch (e) {
			try {
				if (isPostgres) {
					await conn.query('ROLLBACK');
				} else {
					await conn.rollback();
				}
			} catch (_) {}
			console.error(e);
			req.flash('error', 'Failed to update settings');
		} finally {
			conn.release();
			res.redirect('/admin/settings');
		}
	},
	testSmtp: async (req, res) => {
		const settings = await getAllSettingsMap();
		const adapter = getPool();
		const conn = await adapter.getConnection();
		const nowIso = new Date().toISOString();
		let success = false;
		let message = '';
		try {
			const transporter = nodemailer.createTransport({
				host: settings.SMTP_HOST,
				port: Number(settings.SMTP_PORT || 587),
				secure: Number(settings.SMTP_PORT || 587) === 465,
				auth: settings.SMTP_USER ? { user: settings.SMTP_USER, pass: settings.SMTP_PASSWORD } : undefined,
			});
			await transporter.verify();
			await transporter.sendMail({
				from: settings.SMTP_FROM || 'no-reply@example.com',
				to: settings.COMPANY_EMAIL || 'test@example.com',
				subject: 'SMTP Test - Emilash Logistics',
				text: 'This is a test email from Emilash Logistics admin panel.',
			});
			success = true;
			message = 'SMTP verified and test email sent';
			req.flash('success', message);
		} catch (e) {
			console.error('SMTP test failed:', e);
			success = false;
			message = (e && e.message) ? e.message : 'Unknown error';
			req.flash('error', 'SMTP test failed: ' + message);
		} finally {
			try {
				// Persist last SMTP test results in settings
				const entries = [
					['SMTP_LAST_TEST_STATUS', success ? 'success' : 'failure'],
					['SMTP_LAST_TEST_AT', nowIso],
					['SMTP_LAST_TEST_MESSAGE', message]
				];
				for (const [key, value] of entries) {
					const sql = isPostgres
						? 'INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'
						: 'INSERT INTO settings(`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)';
					if (isPostgres) {
						const { query, params } = adapter.convertQuery(sql, [key, value]);
						await conn.query(query, params);
					} else {
						await conn.query(sql, [key, value]);
					}
				}
			} catch (persistErr) {
				console.error('Failed to persist SMTP test results:', persistErr);
			}
			conn.release();
			res.redirect('/admin/settings');
		}
	},
};
