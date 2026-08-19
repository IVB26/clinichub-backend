const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkMigration() {
  try {
    // Check old protocol items
    const protocolItems = await pool.query('SELECT COUNT(*) FROM protocol_items');
    console.log('Old protocol items count:', protocolItems.rows[0].count);

    // Check Reception section
    const reception = await pool.query('SELECT id FROM content_sections WHERE name = $1', ['Reception']);
    console.log('Reception section:', reception.rows[0]);

    if (reception.rows[0]) {
      const sectionId = reception.rows[0].id;

      // Check new section items
      const sectionItems = await pool.query(
        'SELECT COUNT(*) FROM section_items WHERE category_id IN (SELECT id FROM section_categories WHERE section_id = $1)',
        [sectionId]
      );
      console.log('Reception section items count:', sectionItems.rows[0].count);

      // Check categories
      const categories = await pool.query(
        'SELECT id, name FROM section_categories WHERE section_id = $1',
        [sectionId]
      );
      console.log('Reception categories:', categories.rows);

      // Check items per category
      for (const cat of categories.rows) {
        const items = await pool.query(
          'SELECT COUNT(*) FROM section_items WHERE category_id = $1',
          [cat.id]
        );
        console.log(`Items in ${cat.name}:`, items.rows[0].count);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkMigration();
