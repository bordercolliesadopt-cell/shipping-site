const { getPool } = require('../config/db');

const trackingController = {
    // Show tracking page
    async index(req, res) {
        try {
            res.render('public/tracking', {
                layout: 'layouts/public',
                title: 'Track Your Shipment'
            });
        } catch (error) {
            console.error('Error rendering tracking page:', error);
            res.status(500).send('Server Error');
        }
    },

    // Get tracking data via API
    async getTrackingData(req, res) {
        try {
            const { trackingNumber } = req.params;
            
            if (!trackingNumber) {
                return res.status(400).json({ error: 'Tracking number is required' });
            }

            const pool = getPool();
            
            // Get shipment details
            const [shipmentRows] = await pool.query(`
                SELECT 
                    s.*,
                    st.name as current_status_name,
                    st.color as current_status_color,
                    st.description as current_status_description
                FROM shipments s
                LEFT JOIN statuses st ON s.current_status_id = st.id
                WHERE s.tracking_number = ?
            `, [trackingNumber]);

            if (shipmentRows.length === 0) {
                return res.status(404).json({ error: 'Shipment not found' });
            }

            const shipment = shipmentRows[0];

            // Get status history with status details
            const [historyRows] = await pool.query(`
                SELECT 
                    sh.*,
                    st.name as status_name,
                    st.color as status_color,
                    st.description as status_description,
                    st.position as status_position
                FROM status_history sh
                JOIN statuses st ON sh.status_id = st.id
                WHERE sh.shipment_id = ?
                ORDER BY sh.changed_at ASC
            `, [shipment.id]);

            // Build dynamic timeline based on fixed permanent order and insert temporary flags
            // Load all statuses and create lookup maps
            const [allStatusesRows] = await pool.query(`
                SELECT id, name, color, position, description, is_active
                FROM statuses
                ORDER BY position ASC, id ASC
            `);
            const statusById = new Map(allStatusesRows.map(s => [s.id, s]));
            const statusByName = new Map(allStatusesRows.map(s => [(s.name || '').trim(), s]));

            // Permanent backbone in fixed order
            const PERMANENT_ORDER = [
                'Registered',
                'Picked Up',
                'Loaded for Transportation',
                'In Transit',
                'Arrived at State/City',
                'Out for Delivery',
                'Delivered',
            ];
            const PERMANENT_SET = new Set(PERMANENT_ORDER);
            const TEMP_FLAG_NAMES = new Set([
                'On Hold',
                'Delayed',
                'Pending Clearance',
                'Pending Reschedule',
                'Hold for Pickup',
                'Under Investigation',
            ]);

            // Determine current status id, falling back to last history
            let currentStatusId = shipment.current_status_id;
            if (!currentStatusId && historyRows.length > 0) {
                currentStatusId = historyRows[historyRows.length - 1].status_id;
            }
            let currentStatus = currentStatusId ? statusById.get(currentStatusId) : null;

            // Ensure current permanent: if current is temporary or not in permanent set, fallback to last permanent in history
            if (!currentStatus || !PERMANENT_SET.has((currentStatus.name || '').trim())) {
                for (let i = historyRows.length - 1; i >= 0; i--) {
                    const h = historyRows[i];
                    const n = (h.status_name || '').trim();
                    if (PERMANENT_SET.has(n)) {
                        currentStatus = statusByName.get(n);
                        break;
                    }
                }
            }
            const currentPosition = currentStatus && typeof currentStatus.position === 'number' ? currentStatus.position : null;

            // Build permanent steps list from fixed order with state flags and timestamps
            const timestampByName = new Map();
            for (const h of historyRows) {
                const n = (h.status_name || '').trim();
                if (PERMANENT_SET.has(n) && !timestampByName.has(n)) {
                    timestampByName.set(n, { changed_at: h.changed_at, location: h.location });
                }
            }

            const permanentSteps = PERMANENT_ORDER
                .map((name, index) => {
                    const meta = statusByName.get(name) || {};
                    const stepPos = typeof meta.position === 'number' ? meta.position : (index + 1);
                    const ts = timestampByName.get(name) || {};
                    const is_current = currentPosition != null && stepPos === currentPosition;
                    const is_completed = currentPosition != null && stepPos < currentPosition;
                    const is_upcoming = currentPosition != null ? stepPos > currentPosition : !is_current && !is_completed;
                    return {
                        id: meta.id,
                        name,
                        color: meta.color || '#6c757d',
                        position: stepPos,
                        description: meta.description || '',
                        changed_at: ts.changed_at || null,
                        location: ts.location || null,
                        is_current,
                        is_completed,
                        is_upcoming,
                    };
                })
                .sort((a, b) => a.position - b.position);

            // Find the timestamp of the last completed or current permanent step
            let anchorTime = null;
            for (let i = permanentSteps.length - 1; i >= 0; i--) {
                const s = permanentSteps[i];
                if (s.is_completed || s.is_current) {
                    anchorTime = s.changed_at || anchorTime;
                    break;
                }
            }

            // Extract temporary flags that occurred after the anchor time
            const toneForTemp = (name) => {
                const key = (name || '').toLowerCase();
                if (key.includes('investigation')) return 'danger';
                if (key.includes('delayed')) return 'warning';
                if (key.includes('clearance')) return 'warning';
                if (key.includes('hold')) return 'warning';
                return 'primary';
            };
            const iconForTemp = (name) => {
                const key = (name || '').toLowerCase();
                if (key.includes('investigation')) return 'bi-shield-exclamation';
                if (key.includes('delayed')) return 'bi-exclamation-triangle';
                if (key.includes('clearance')) return 'bi-shield-lock';
                if (key.includes('hold')) return 'bi-pause-circle';
                if (key.includes('reschedule')) return 'bi-calendar-event';
                return 'bi-info-circle';
            };
            const flags = historyRows
                .filter(h => TEMP_FLAG_NAMES.has((h.status_name || '').trim()))
                .filter(h => !anchorTime || new Date(h.changed_at) >= new Date(anchorTime))
                .map(h => ({
                    name: (h.status_name || '').trim(),
                    color: h.status_color || '#ffc107',
                    changed_at: h.changed_at,
                    location: h.location || null,
                    note: h.note || null,
                    tone: toneForTemp(h.status_name),
                    icon: iconForTemp(h.status_name),
                    message: h.note || h.status_description || (h.status_name || 'Status'),
                }));

            // Format the response
            const trackingData = {
                shipment: {
                    id: shipment.id,
                    tracking_number: shipment.tracking_number,
                    sender_name: shipment.sender_name,
                    receiver_name: shipment.receiver_name,
                    origin: shipment.origin,
                    destination: shipment.destination,
                    current_location: shipment.current_location,
                    current_lat: shipment.current_lat,
                    current_lng: shipment.current_lng,
                    package_description: shipment.package_description,
                    package_weight: shipment.package_weight,
                    service_type: shipment.service_type,
                    priority: shipment.priority,
                    eta: shipment.eta,
                    created_at: shipment.created_at,
                    // coordinates for live map
                    sender_lat: shipment.sender_lat,
                    sender_lng: shipment.sender_lng,
                    receiver_lat: shipment.receiver_lat,
                    receiver_lng: shipment.receiver_lng,
                    current_status: {
                        id: shipment.current_status_id,
                        name: shipment.current_status_name,
                        color: shipment.current_status_color,
                        description: shipment.current_status_description
                    }
                },
                status_history: historyRows.map(row => ({
                    id: row.id,
                    status_name: row.status_name,
                    status_color: row.status_color,
                    status_description: row.status_description,
                    status_position: row.status_position,
                    note: row.note,
                    location: row.location,
                    changed_at: row.changed_at
                })),
                steps: permanentSteps,
                flags
            };

            res.json(trackingData);
        } catch (error) {
            console.error('Error fetching tracking data:', error);
            res.status(500).json({ error: 'Server error while fetching tracking data' });
        }
    }
};

module.exports = trackingController;
