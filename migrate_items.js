const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateItems() {
  try {
    console.log('Starting migration of protocol items...');

    // Get Reception section
    const sectionResult = await pool.query('SELECT id FROM content_sections WHERE name = $1', ['Reception']);
    if (sectionResult.rows.length === 0) {
      console.log('Reception section not found');
      process.exit(1);
    }
    const sectionId = sectionResult.rows[0].id;
    console.log('Reception section ID:', sectionId);

    // Get old protocol items with category info
    const protocolItems = await pool.query(`
      SELECT pi.id, pi.title, pi.description, pi.sort_order, pc.name as category_name
      FROM protocol_items pi
      LEFT JOIN protocol_categories pc ON pi.category_id = pc.id
      ORDER BY pi.sort_order
    `);

    console.log('Found', protocolItems.rows.length, 'protocol items');

    let migrated = 0;
    for (const item of protocolItems.rows) {
      try {
        // Find matching category
        const categoryResult = await pool.query(
          'SELECT id FROM section_categories WHERE section_id = $1 AND name = $2',
          [sectionId, item.category_name || 'Miscellaneous']
        );

        if (categoryResult.rows.length > 0) {
          const categoryId = categoryResult.rows[0].id;
          
          // Insert item
          await pool.query(
            'INSERT INTO section_items (category_id, title, content, sort_order) VALUES ($1, $2, $3, $4)',
            [categoryId, item.title, item.description || '', item.sort_order || 0]
          );
          migrated++;
        }
      } catch (err) {
        console.error(`Error migrating item "${item.title}":`, err.message);
      }
    }

    console.log('Successfully migrated', migrated, 'items');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateItems();
