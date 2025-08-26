const { getPool } = require('../config/db');
const nodemailer = require('nodemailer');

async function getAllSettingsMap() {
	try {
		const [rows] = await getPool().query('SELECT `key`, `value` FROM settings');
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
		const conn = await getPool().getConnection();
		try {
			await conn.beginTransaction();
			for (const [key, value] of entries) {
				await conn.query('INSERT INTO settings(`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, value]);
			}
			await conn.commit();
			req.flash('success', 'Settings updated');
		} catch (e) {
			await conn.rollback();
			console.error(e);
			req.flash('error', 'Failed to update settings');
		}
		conn.release();
		res.redirect('/admin/settings');
	},
	testSmtp: async (req, res) => {
		const settings = await getAllSettingsMap();
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
			req.flash('success', 'SMTP test email sent');
		} catch (e) {
			console.error(e);
			req.flash('error', 'SMTP test failed: ' + (e && e.message));
		}
		res.redirect('/admin/settings');
	},
};
