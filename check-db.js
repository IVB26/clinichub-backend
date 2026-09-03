const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(
      'SELECT id, card_title, card_image, card_description FROM homepage_cards ORDER BY id DESC LIMIT 5;'
    );
    console.log('Cards in database:');
    result.rows.forEach(card => {
      console.log(`ID: ${card.id}, Title: "${card.card_title}", Image: ${card.card_image ? 'SET' : 'NULL'}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
