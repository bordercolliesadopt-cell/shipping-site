const dbConfig = (process.env.DATABASE_URL || process.env.NODE_ENV === 'production')
	? require('../config/db-postgres')
	: require('../config/db');
const { getPool } = dbConfig;
const bcrypt = require('bcryptjs');

module.exports = {
	getLogin: (req, res) => {
		if (req.session && req.session.adminUser) return res.redirect('/admin');
		res.render('auth/login', { title: 'Admin Login' });
	},
	postLogin: async (req, res) => {
		const { email, password } = req.body;
		try {
			const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [email]);
			if (!rows || rows.length === 0) {
				req.flash('error', 'Invalid credentials');
				return res.redirect('/admin/login');
			}
			const user = rows[0];
			const ok = await bcrypt.compare(password, user.password_hash);
			if (!ok) {
				req.flash('error', 'Invalid credentials');
				return res.redirect('/admin/login');
			}
			req.session.adminUser = { id: user.id, email: user.email, name: user.name };
			res.redirect('/admin');
		} catch (e) {
			console.error(e);
			req.flash('error', 'Login failed');
			res.redirect('/admin/login');
		}
	},
	postLogout: (req, res) => {
		req.session.destroy(() => {
			res.redirect('/admin/login');
		});
	},
};
