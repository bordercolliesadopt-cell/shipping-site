const { getPool } = require('../config/db');
const { validationResult, body } = require('express-validator');

function validators() {
	return [
		body('name').trim().notEmpty().withMessage('Name required'),
		body('color').trim().notEmpty().withMessage('Color required'),
		body('position').isInt().withMessage('Position must be an integer'),
	];
}

module.exports = {
	index: async (req, res) => {
		const [rows] = await getPool().query('SELECT * FROM statuses ORDER BY position ASC, id ASC');
		res.render('statuses/index', { title: 'Statuses', statuses: rows });
	},
	newForm: (req, res) => {
		res.render('statuses/new', { title: 'New Status', form: {} });
	},
	create: [
		...validators(),
		async (req, res) => {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).render('statuses/new', { title: 'New Status', errors: errors.array(), form: req.body });
			}
			const { name, color, position, is_terminal, description } = req.body;
			await getPool().query('INSERT INTO statuses (name, color, position, is_terminal, description) VALUES (?, ?, ?, ?, ?)', [name, color, position, is_terminal ? 1 : 0, description || null]);
			req.flash('success', 'Status created');
			res.redirect('/admin/statuses');
		},
	],
	editForm: async (req, res) => {
		const id = req.params.id;
		const [[status]] = await getPool().query('SELECT * FROM statuses WHERE id = ?', [id]);
		if (!status) return res.redirect('/admin/statuses');
		res.render('statuses/edit', { title: 'Edit Status', status });
	},
	update: [
		...validators(),
		async (req, res) => {
			const id = req.params.id;
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).render('statuses/edit', { title: 'Edit Status', status: { id, ...req.body }, errors: errors.array() });
			}
			const { name, color, position, is_terminal, description } = req.body;
			await getPool().query('UPDATE statuses SET name=?, color=?, position=?, is_terminal=?, description=? WHERE id = ?', [name, color, position, is_terminal ? 1 : 0, description || null, id]);
			req.flash('success', 'Status updated');
			res.redirect('/admin/statuses');
		},
	],
	destroy: async (req, res) => {
		const id = req.params.id;
		await getPool().query('DELETE FROM statuses WHERE id = ?', [id]);
		req.flash('success', 'Status deleted');
		res.redirect('/admin/statuses');
	},
};
