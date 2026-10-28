// Thin wrapper over a mysql2 pool. The rest of the server only uses get / all / run,
// so tests can swap in an in-memory database with the same three methods.

export async function createDb(config) {
  const { default: mysql } = await import("mysql2/promise");
  const pool = mysql.createPool({
    ...config,
    connectionLimit: 10,
    waitForConnections: true,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true,
  });

  return {
    /** Array of rows. */
    async all(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    /** First row or null. */
    async get(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows[0] ?? null;
    },
    /** For INSERT / UPDATE / DELETE: { insertId, affectedRows }. */
    async run(sql, params = []) {
      const [result] = await pool.query(sql, params);
      return { insertId: Number(result.insertId || 0), affectedRows: result.affectedRows };
    },
    async close() {
      await pool.end();
    },
  };
}
