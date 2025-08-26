const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

function loadEnv() {
	const envPath = path.join(process.cwd(), '.env');
	if (fs.existsSync(envPath)) {
		dotenv.config({ path: envPath });
	} else {
		dotenv.config();
	}
}

module.exports = { loadEnv };
