const { getPool } = require('../config/db');

module.exports = {
	index: async (req, res) => {
		const pool = getPool();
		
		// Basic stats
		const [[{ totalShipments }]] = await pool.query('SELECT COUNT(*) AS totalShipments FROM shipments');
		const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
		const [[{ delivered }]] = await pool.query("SELECT COUNT(*) AS delivered FROM shipments s JOIN statuses st ON s.current_status_id = st.id WHERE st.is_terminal = 1 AND st.name = 'Delivered'");
		
		// Additional stats
		const [[{ inTransit }]] = await pool.query("SELECT COUNT(*) AS inTransit FROM shipments s JOIN statuses st ON s.current_status_id = st.id WHERE st.name IN ('In Transit', 'Out for Delivery', 'At Sorting Facility')");
		const [[{ pending }]] = await pool.query("SELECT COUNT(*) AS pending FROM shipments s LEFT JOIN statuses st ON s.current_status_id = st.id WHERE st.name IN ('Order Received', 'Processing', 'On Hold') OR st.name IS NULL");
		
		// Recent shipments
		const [recentShipments] = await pool.query(`
			SELECT s.*, st.name AS status_name, st.color AS status_color
			FROM shipments s
			LEFT JOIN statuses st ON s.current_status_id = st.id
			ORDER BY s.created_at DESC
			LIMIT 10
		`);
		
		res.render('admin/dashboard', {
			title: 'Dashboard',
			stats: { 
				totalShipments, 
				totalUsers, 
				delivered, 
				inTransit, 
				pending 
			},
			recentShipments,
		});
	},
};
