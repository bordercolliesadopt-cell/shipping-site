const dbConfig = (process.env.DATABASE_URL || process.env.NODE_ENV === 'production')
	? require('../config/db-postgres')
	: require('../config/db');
const { getPool, isPostgres } = dbConfig;

// Helper function to create a new notification
async function createNotification(userId, title, message, type = 'info', actionUrl = null, icon = null) {
	await getPool().query(
		'INSERT INTO notifications (user_id, title, message, type, action_url, icon) VALUES (?, ?, ?, ?, ?, ?)',
		[userId, title, message, type, actionUrl, icon]
	);
}

module.exports = {
	// Get all notifications for a user
	getNotifications: async (req, res) => {
		try {
			const userId = req.session.adminUser?.id;
			const limit = parseInt(req.query.limit) || 10;
			
			if (!userId) {
				return res.json({ success: false, message: 'User not authenticated' });
			}

			const dateExpr = isPostgres
				? "to_char(n.created_at, 'Mon DD, YYYY at HH12:MI AM')"
				: "DATE_FORMAT(n.created_at, '%b %d, %Y at %h:%i %p')";
			const [notifications] = await getPool().query(
				`SELECT n.*, ${dateExpr} as formatted_date
				 FROM notifications n 
				 WHERE n.user_id = ? OR n.user_id IS NULL
				 ORDER BY n.created_at DESC 
				 LIMIT ?`,
				[userId, limit]
			);

			const unreadWhere = isPostgres
				? 'SELECT COUNT(*) as unreadCount FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND is_read = FALSE'
				: 'SELECT COUNT(*) as unreadCount FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0';
			const [[{ unreadCount }]] = await getPool().query(unreadWhere, [userId]);

			res.json({
				success: true,
				notifications,
				unreadCount: parseInt(unreadCount)
			});
		} catch (error) {
			console.error('Error fetching notifications:', error);
			res.status(500).json({ success: false, message: 'Server error' });
		}
	},

	// Mark notification as read
	markAsRead: async (req, res) => {
		try {
			const { id } = req.params;
			const userId = req.session.adminUser?.id;

			if (!userId) {
				return res.json({ success: false, message: 'User not authenticated' });
			}

			const markOneSql = isPostgres
				? 'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)'
				: 'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND (user_id = ? OR user_id IS NULL)';
			await getPool().query(markOneSql, [id, userId]);

			res.json({ success: true });
		} catch (error) {
			console.error('Error marking notification as read:', error);
			res.status(500).json({ success: false, message: 'Server error' });
		}
	},

	// Mark all notifications as read
	markAllAsRead: async (req, res) => {
		try {
			const userId = req.session.adminUser?.id;

			if (!userId) {
				return res.json({ success: false, message: 'User not authenticated' });
			}

			const markAllSql = isPostgres
				? 'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE (user_id = $1 OR user_id IS NULL) AND is_read = FALSE'
				: 'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0';
			await getPool().query(markAllSql, [userId]);

			res.json({ success: true });
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
			res.status(500).json({ success: false, message: 'Server error' });
		}
	},

	// Delete notification
	deleteNotification: async (req, res) => {
		try {
			const { id } = req.params;
			const userId = req.session.adminUser?.id;

			if (!userId) {
				return res.json({ success: false, message: 'User not authenticated' });
			}

			await getPool().query(
				'DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
				[id, userId]
			);

			res.json({ success: true });
		} catch (error) {
			console.error('Error deleting notification:', error);
			res.status(500).json({ success: false, message: 'Server error' });
		}
	},

	// Create notification utility
	createNotification
};
