const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('Altering homepage_cards.card_image column to TEXT...');
    await pool.query('ALTER TABLE homepage_cards ALTER COLUMN card_image TYPE TEXT');
    console.log('✓ Column type updated successfully');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
