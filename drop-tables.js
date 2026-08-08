const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function dropTables() {
  try {
    console.log('Dropping protocol tables...');
    await pool.query('DROP TABLE IF EXISTS protocol_sms_templates CASCADE');
    await pool.query('DROP TABLE IF EXISTS protocol_forms CASCADE');
    await pool.query('DROP TABLE IF EXISTS protocol_blocks CASCADE');
    await pool.query('DROP TABLE IF EXISTS protocol_items CASCADE');
    await pool.query('DROP TABLE IF EXISTS protocol_categories CASCADE');
    console.log('Tables dropped successfully');
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

dropTables();
