// Database adapter to handle MySQL vs PostgreSQL differences

class DatabaseAdapter {
	constructor(pool, isPostgres = false) {
		this.pool = pool;
		this.isPostgres = isPostgres;
	}

	// Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
	convertQuery(query, params) {
		if (!this.isPostgres) {
			return { query, params };
		}

		let paramIndex = 1;
		const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
		return { query: convertedQuery, params };
	}

	async query(sql, params = []) {
		const { query, params: convertedParams } = this.convertQuery(sql, params);
		
		if (this.isPostgres) {
			const result = await this.pool.query(query, convertedParams);
			// Convert PostgreSQL result format to MySQL-like format
			return [result.rows, result.fields];
		} else {
			return await this.pool.query(query, convertedParams);
		}
	}

	async getConnection() {
		if (this.isPostgres) {
			return await this.pool.connect();
		} else {
			return await this.pool.getConnection();
		}
	}
}

module.exports = DatabaseAdapter;
