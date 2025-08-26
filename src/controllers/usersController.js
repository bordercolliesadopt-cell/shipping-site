const dbConfig = (process.env.DATABASE_URL || process.env.NODE_ENV === 'production')
	? require('../config/db-postgres')
	: require('../config/db');
const { getPool } = dbConfig;
const { validationResult, body } = require('express-validator');
const bcrypt = require('bcryptjs');

function validators() {
	return [
		body('name').trim().notEmpty().withMessage('Name required'),
		body('email').trim().isEmail().withMessage('Valid email required'),
		body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
	];
}

module.exports = {
	index: async (req, res) => {
		const [rows] = await getPool().query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
		res.render('users/index', { title: 'Users', users: rows });
	},
	
	newForm: (req, res) => {
		res.render('users/new', { title: 'New User', form: {} });
	},
	
	create: [
		...validators(),
		body('password').notEmpty().withMessage('Password required for new user'),
		async (req, res) => {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).render('users/new', { 
					title: 'New User', 
					errors: errors.array(), 
					form: req.body 
				});
			}
			
			const { name, email, password, role } = req.body;
			
			// Check if email already exists
			const [existing] = await getPool().query('SELECT id FROM users WHERE email = ?', [email]);
			if (existing.length > 0) {
				return res.status(400).render('users/new', { 
					title: 'New User', 
					errors: [{ msg: 'Email already exists' }], 
					form: req.body 
				});
			}
			
			const passwordHash = await bcrypt.hash(password, 10);
			await getPool().query(
				'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
				[name, email, passwordHash, role || 'admin']
			);
			
			req.flash('success', 'User created successfully');
			res.redirect('/admin/users');
		},
	],
	
	editForm: async (req, res) => {
		const id = req.params.id;
		const [[user]] = await getPool().query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
		if (!user) return res.redirect('/admin/users');
		res.render('users/edit', { title: 'Edit User', user });
	},
	
	update: [
		...validators(),
		async (req, res) => {
			const id = req.params.id;
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).render('users/edit', { 
					title: 'Edit User', 
					user: { id, ...req.body }, 
					errors: errors.array() 
				});
			}
			
			const { name, email, password, role } = req.body;
			
			// Check if email already exists for other users
			const [existing] = await getPool().query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
			if (existing.length > 0) {
				return res.status(400).render('users/edit', { 
					title: 'Edit User', 
					user: { id, ...req.body }, 
					errors: [{ msg: 'Email already exists' }] 
				});
			}
			
			if (password && password.trim()) {
				// Update with new password
				const passwordHash = await bcrypt.hash(password, 10);
				await getPool().query(
					'UPDATE users SET name=?, email=?, password_hash=?, role=? WHERE id=?',
					[name, email, passwordHash, role || 'admin', id]
				);
			} else {
				// Update without changing password
				await getPool().query(
					'UPDATE users SET name=?, email=?, role=? WHERE id=?',
					[name, email, role || 'admin', id]
				);
			}
			
			req.flash('success', 'User updated successfully');
			res.redirect('/admin/users');
		},
	],
	
	destroy: async (req, res) => {
		const id = req.params.id;
		
		// Prevent deleting the current user
		if (Number(id) === req.session.adminUser.id) {
			req.flash('error', 'Cannot delete your own account');
			return res.redirect('/admin/users');
		}
		
		// Prevent deleting the last admin
		const [[{ adminCount }]] = await getPool().query("SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'");
		if (adminCount <= 1) {
			req.flash('error', 'Cannot delete the last admin user');
			return res.redirect('/admin/users');
		}
		
		await getPool().query('DELETE FROM users WHERE id = ?', [id]);
		req.flash('success', 'User deleted successfully');
		res.redirect('/admin/users');
	},
};

