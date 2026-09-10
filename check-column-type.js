const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name='homepage_cards' AND column_name='card_image'
    `);
    console.log('Column info:', result.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
