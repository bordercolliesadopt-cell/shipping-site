const mysql = require('mysql2/promise');

(async () => {
  const DB_CONFIG = {
    host: '82.197.82.47',
    port: 3306,
    user: 'u297651930_emileshipping',
    password: 'Aa18552219$',
    database: 'u297651930_emileshipping',
    waitForConnections: true,
    connectionLimit: 10,
  };
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('Connected');
    const [cols] = await conn.query("DESCRIBE shipments");
    console.log('\nshipments columns:');
    cols.forEach(c => console.log(`- ${c.Field} ${c.Type}`));

    const [statuses] = await conn.query("SELECT id, name, is_active, position FROM statuses ORDER BY position ASC, id ASC");
    console.log('\nstatuses:');
    statuses.forEach(s => console.log(`- ${s.id} ${s.name} active=${s.is_active} pos=${s.position}`));

    const [sample] = await conn.query("SELECT tracking_number, sender_name, receiver_name, package_weight FROM shipments ORDER BY id DESC LIMIT 3");
    console.log('\nrecent shipments:');
    sample.forEach(r => console.log(`- ${r.tracking_number} ${r.sender_name} -> ${r.receiver_name} weight=${r.package_weight}`));
  } catch (e) {
    console.error('Check failed:', e.message);
  } finally {
    if (conn) await conn.end();
  }
})();
