const { getPool } = require('../config/db');
const { validationResult, body } = require('express-validator');
const dayjs = require('dayjs');
const nodemailer = require('nodemailer');

async function listStatuses() {
	// Only show active statuses in the UI to hide less important ones
	const [rows] = await getPool().query('SELECT * FROM statuses WHERE is_active = 1 ORDER BY position ASC, id ASC');
	return rows;
}

function validators() {
	return [
		body('sender_name').trim().notEmpty().withMessage('Sender name required'),
		body('receiver_name').trim().notEmpty().withMessage('Receiver name required'),
	];
}

async function generateUniqueTrackingNumber(prefix) {
	const pool = getPool();
	const safePrefix = (prefix || 'EMI').toUpperCase().replace(/[^A-Z0-9]/g, '');
	for (let i = 0; i < 10; i++) {
		const candidate = `${safePrefix}-${dayjs().format('YYMMDD')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
		const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM shipments WHERE tracking_number = ?', [candidate]);
		if (cnt === 0) return candidate;
	}
	return `${safePrefix}-${dayjs().format('YYMMDDHHmmss')}`;
}

module.exports = {
	index: async (req, res) => {
		const { search, status, priority, service } = req.query;
		
		let query = `SELECT s.*, st.name AS status_name, st.color AS status_color
					 FROM shipments s
					 LEFT JOIN statuses st ON s.current_status_id = st.id`;
		
		let conditions = [];
		let params = [];
		
		if (search) {
			conditions.push(`(s.tracking_number LIKE ? OR s.sender_name LIKE ? OR s.receiver_name LIKE ?)`);
			const searchTerm = `%${search}%`;
			params.push(searchTerm, searchTerm, searchTerm);
		}
		
		if (status) {
			conditions.push(`s.current_status_id = ?`);
			params.push(status);
		}
		
		if (priority) {
			conditions.push(`s.priority = ?`);
			params.push(priority);
		}
		
		if (service) {
			conditions.push(`s.service_type = ?`);
			params.push(service);
		}
		
		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(' AND ')}`;
		}
		
		query += ` ORDER BY s.id DESC LIMIT 200`;
		
		const [rows] = await getPool().query(query, params);
		const statuses = await listStatuses();
		
		res.render('shipments/index', { 
			title: 'Shipments', 
			shipments: rows, 
			statuses,
			search, 
			status, 
			priority, 
			service 
		});
	},
	newForm: async (req, res) => {
		const statuses = await listStatuses();
		res.render('shipments/new', { title: 'New Shipment', statuses, form: {} });
	},
	create: [
		...validators(),
		async (req, res) => {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				const statuses = await listStatuses();
				return res.status(400).render('shipments/new', { title: 'New Shipment', statuses, errors: errors.array(), form: req.body });
			}
			const {
				tracking_number,
				sender_name, sender_email, sender_phone, sender_alt_phone, sender_address, sender_company, sender_city, sender_state, sender_postal_code, sender_country,
				receiver_name, receiver_email, receiver_phone, receiver_alt_phone, receiver_address, receiver_company, receiver_city, receiver_state, receiver_postal_code, receiver_country,
				origin, destination, current_location, package_description, package_type, package_weight, package_dimensions, package_value, package_quantity, package_length, package_width, package_height,
				service_type, priority, special_instructions, eta, current_status_id,
				animal_species, animal_health_certificate, temperature_controlled, special_handling_required, insurance_required, insurance_value, declared_currency, hs_code, dangerous_goods, un_number, temperature_min, temperature_max, incoterms, pickup_date, delivery_window_start, delivery_window_end,
				current_lat, current_lng, sender_lat, sender_lng, receiver_lat, receiver_lng,
			} = req.body;
			// Convert lb to kg (UI uses lb); round to 2 decimals
			const weightParsed = (package_weight !== undefined && package_weight !== null && String(package_weight).trim() !== '')
				? Number(package_weight)
				: null;
			const weightKg = weightParsed !== null && !Number.isNaN(weightParsed)
				? Math.round((weightParsed * 0.45359237) * 100) / 100
				: null;
			const createdBy = req.session.adminUser.id;
			const prefix = (res.locals && res.locals.appSettings && res.locals.appSettings.TRACKING_PREFIX) || 'EMI';
			const trackingNumberToUse = (tracking_number && String(tracking_number).trim())
				? String(tracking_number).trim()
				: await generateUniqueTrackingNumber(prefix);
			// Build placeholders matching the number of columns (61)
			const placeholders = new Array(61).fill('?').join(', ');
			await getPool().query(
				`INSERT INTO shipments (
					tracking_number,
					sender_name, sender_email, sender_phone, sender_alt_phone, sender_address, sender_company, sender_city, sender_state, sender_postal_code, sender_country,
					receiver_name, receiver_email, receiver_phone, receiver_alt_phone, receiver_address, receiver_company, receiver_city, receiver_state, receiver_postal_code, receiver_country,
					origin, destination, current_location, current_lat, current_lng, sender_lat, sender_lng, receiver_lat, receiver_lng, package_description, package_type, package_weight, package_dimensions, package_value, package_quantity, package_length, package_width, package_height,
					animal_species, animal_health_certificate, temperature_controlled, special_handling_required, insurance_required, insurance_value, declared_currency, hs_code, dangerous_goods, un_number, temperature_min, temperature_max, incoterms, pickup_date, delivery_window_start, delivery_window_end,
					service_type, priority, special_instructions, eta, current_status_id, created_by
				)
				 VALUES (${placeholders})`,
				[
					trackingNumberToUse,
					sender_name, sender_email || null, sender_phone || null, sender_alt_phone || null, sender_address || null, sender_company || null, sender_city || null, sender_state || null, sender_postal_code || null, sender_country || null,
					receiver_name, receiver_email || null, receiver_phone || null, receiver_alt_phone || null, receiver_address || null, receiver_company || null, receiver_city || null, receiver_state || null, receiver_postal_code || null, receiver_country || null,
					origin || null, destination || null, current_location || null, (current_lat ? Number(current_lat) : null), (current_lng ? Number(current_lng) : null), (sender_lat ? Number(sender_lat) : null), (sender_lng ? Number(sender_lng) : null), (receiver_lat ? Number(receiver_lat) : null), (receiver_lng ? Number(receiver_lng) : null), package_description || null, package_type || 'general', weightKg, package_dimensions || null, package_value || null, package_quantity || null, package_length || null, package_width || null, package_height || null,
					animal_species || null, animal_health_certificate ? 1 : 0, temperature_controlled ? 1 : 0, special_handling_required ? 1 : 0, insurance_required ? 1 : 0, insurance_value || null, declared_currency || 'USD', hs_code || null, dangerous_goods ? 1 : 0, un_number || null, temperature_min || null, temperature_max || null, incoterms || 'DAP',
					pickup_date ? dayjs(pickup_date).format('YYYY-MM-DD HH:mm:ss') : null,
					delivery_window_start ? dayjs(delivery_window_start).format('YYYY-MM-DD HH:mm:ss') : null,
					delivery_window_end ? dayjs(delivery_window_end).format('YYYY-MM-DD HH:mm:ss') : null,
					service_type || 'standard', priority || 'normal', special_instructions || null,
					eta ? dayjs(eta).format('YYYY-MM-DD HH:mm:ss') : null,
					current_status_id || null,
					createdBy,
				]
			);
			// Optional: notify parties on creation if enabled
			try {
				await sendStatusEmailIfEnabled({
					shipment: { id: this?.lastInsertId, tracking_number: trackingNumberToUse, sender_email, receiver_email },
					status: { name: 'Registered' },
					note: 'Shipment created',
				});
			} catch (_) {}
			req.flash('success', 'Shipment created');
			res.redirect('/admin/shipments');
		},
	],
	show: async (req, res) => {
		const id = req.params.id;
		const [[shipment]] = await getPool().query(
			`SELECT s.*, st.name AS status_name, st.color AS status_color
			 FROM shipments s
			 LEFT JOIN statuses st ON s.current_status_id = st.id
			 WHERE s.id = ?`,
			[id]
		);
		if (!shipment) return res.redirect('/admin/shipments');
		const [history] = await getPool().query(
			`SELECT h.*, st.name AS status_name, st.color AS status_color, u.name AS changed_by_name
			 FROM status_history h
			 JOIN statuses st ON h.status_id = st.id
			 LEFT JOIN users u ON h.changed_by = u.id
			 WHERE h.shipment_id = ?
			 ORDER BY h.changed_at DESC`,
			[id]
		);
		const statuses = await listStatuses();
		res.render('shipments/show', { title: `Shipment #${shipment.tracking_number}`, shipment, history, statuses });
	},
	editForm: async (req, res) => {
		const id = req.params.id;
		const [[shipment]] = await getPool().query('SELECT * FROM shipments WHERE id = ?', [id]);
		if (!shipment) return res.redirect('/admin/shipments');
		const statuses = await listStatuses();
		res.render('shipments/edit', { title: 'Edit Shipment', shipment, statuses });
	},
	update: [
		...validators(),
		async (req, res) => {
			const id = req.params.id;
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				const statuses = await listStatuses();
				return res.status(400).render('shipments/edit', { title: 'Edit Shipment', shipment: { id, ...req.body }, statuses, errors: errors.array() });
			}
			const {
				sender_name, sender_email, sender_phone,
				receiver_name, receiver_email, receiver_phone,
				origin, destination, current_location, current_lat, current_lng, package_description, package_weight, eta, current_status_id,
			} = req.body;
			const weightParsedU = (package_weight !== undefined && package_weight !== null && String(package_weight).trim() !== '')
				? Number(package_weight)
				: null;
			const weightKgU = weightParsedU !== null && !Number.isNaN(weightParsedU)
				? Math.round((weightParsedU * 0.45359237) * 100) / 100
				: null;
			await getPool().query(
				`UPDATE shipments SET sender_name=?, sender_email=?, sender_phone=?, receiver_name=?, receiver_email=?, receiver_phone=?, origin=?, destination=?, current_location=?, current_lat=?, current_lng=?, package_description=?, package_weight=?, eta=?, current_status_id=? WHERE id=?`,
				[
					sender_name, sender_email || null, sender_phone || null,
					receiver_name, receiver_email || null, receiver_phone || null,
					origin || null, destination || null, current_location || null,
					(current_lat ? Number(current_lat) : null), (current_lng ? Number(current_lng) : null),
					package_description || null,
					weightKgU,
					eta ? dayjs(eta).format('YYYY-MM-DD HH:mm:ss') : null,
					current_status_id || null,
					id,
				]
			);
			// If status changed, optionally notify
			try {
				if (current_status_id) {
					const [[statusRow]] = await getPool().query('SELECT name FROM statuses WHERE id=?', [current_status_id]);
					const [[shipRow]] = await getPool().query('SELECT tracking_number, sender_email, receiver_email FROM shipments WHERE id=?', [id]);
					await sendStatusEmailIfEnabled({ shipment: shipRow, status: statusRow, note: 'Shipment details updated' });
				}
			} catch (_) {}
			req.flash('success', 'Shipment updated');
			res.redirect('/admin/shipments/' + id);
		},
	],
	destroy: async (req, res) => {
		const id = req.params.id;
		await getPool().query('DELETE FROM shipments WHERE id = ?', [id]);
		req.flash('success', 'Shipment deleted');
		res.redirect('/admin/shipments');
	},
	addStatus: async (req, res) => {
		const id = req.params.id;
		const { status_id, note } = req.body;
		const userId = req.session.adminUser.id;
		await getPool().query(
			'INSERT INTO status_history (shipment_id, status_id, note, changed_by) VALUES (?, ?, ?, ?)',
			[id, status_id, note || null, userId]
		);
		await getPool().query('UPDATE shipments SET current_status_id = ? WHERE id = ?', [status_id, id]);
		// Notify sender and receiver if enabled
		try {
			const [[statusRow]] = await getPool().query('SELECT name FROM statuses WHERE id=?', [status_id]);
			const [[shipRow]] = await getPool().query('SELECT tracking_number, sender_email, receiver_email FROM shipments WHERE id=?', [id]);
			await sendStatusEmailIfEnabled({ shipment: shipRow, status: statusRow, note });
		} catch (_) {}
		req.flash('success', 'Status added');
		res.redirect('/admin/shipments/' + id);
	},
};

// Helper: send status email if settings permit and SMTP configured
async function sendStatusEmailIfEnabled({ shipment, status, note }) {
    const settings = await getAllSettingsMapSafe();
    if (!settings || settings.EMAIL_NOTIFICATIONS !== '1' || settings.NOTIFY_STATUS_CHANGED !== '1') return;
    const host = settings.SMTP_HOST;
    const port = Number(settings.SMTP_PORT || 587);
    const user = settings.SMTP_USER;
    const pass = settings.SMTP_PASSWORD;
    const from = settings.SMTP_FROM || 'no-reply@example.com';
    if (!host || !from) return; // require at least host and from

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
    });

    const subject = `Shipment ${shipment.tracking_number} - Status Updated to ${status?.name || 'Updated'}`;
    const text = `Your shipment ${shipment.tracking_number} status is now: ${status?.name || 'Updated'}${note ? `\nNote: ${note}` : ''}`;
    const html = `<p>Your shipment <strong>${shipment.tracking_number}</strong> status is now: <strong>${status?.name || 'Updated'}</strong></p>${note ? `<p><em>Note:</em> ${note}</p>` : ''}`;

    const recipients = [shipment.sender_email, shipment.receiver_email].filter(Boolean);
    if (recipients.length === 0) return;

    await transporter.sendMail({ from, to: recipients.join(','), subject, text, html });
}

async function getAllSettingsMapSafe() {
    try {
        const [rows] = await getPool().query('SELECT `key`, `value` FROM settings');
        const map = {};
        rows?.forEach(r => (map[r.key] = r.value));
        return map;
    } catch (e) {
        return {};
    }
}
