const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

async function initDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const sql = fs.readFileSync('./init-db.sql', 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await pool.query(statement);
      }
    }
    console.log('✓ Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  } finally {
    await pool.end();
  }
}

initDb();
