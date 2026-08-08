const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Creating protocol_items table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocol_items (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES protocol_categories(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ protocol_items table created');

    console.log('Creating protocol_blocks table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocol_blocks (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES protocol_items(id) ON DELETE CASCADE,
        type VARCHAR(50),
        content TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ protocol_blocks table created');

    // Get Surgery Protocols category ID
    const catResult = await pool.query('SELECT id FROM protocol_categories WHERE name = $1', ['Surgery Protocols']);
    const categoryId = catResult.rows[0].id;

    console.log('\nSeeding Surgery Protocols items...');

    // Add sample items for Surgery Protocols
    const items = [
      {
        title: 'Spay/Neuter Protocol',
        description: 'Standard spay and neuter surgical procedure guidelines',
        blocks: [
          { type: 'heading', content: 'Pre-Operative Preparation' },
          { type: 'text', content: '1. Pre-surgical bloodwork required for all animals over 7 years\n2. NPO (nothing by mouth) 8-12 hours before surgery\n3. IV catheter placement\n4. Administer pre-anesthetic medications' },
          { type: 'heading', content: 'Post-Operative Care' },
          { type: 'text', content: '1. Pain management for 3-5 days\n2. E-collar to prevent incision licking\n3. Restricted activity for 10-14 days\n4. Suture removal in 10-14 days' }
        ]
      },
      {
        title: 'Dental Extraction',
        description: 'Guidelines for dental extractions and oral surgery',
        blocks: [
          { type: 'heading', content: 'Pre-Extraction Assessment' },
          { type: 'text', content: '1. Full mouth radiographs required\n2. Assess tooth vitality and root structure\n3. Evaluate bone density' },
          { type: 'heading', content: 'Post-Extraction Instructions' },
          { type: 'text', content: '1. Soft diet for 2 weeks\n2. Pain management as prescribed\n3. Monitor extraction site daily' }
        ]
      },
      {
        title: 'Laceration Repair',
        description: 'Wound closure and suturing procedures',
        blocks: [
          { type: 'heading', content: 'Wound Assessment' },
          { type: 'text', content: '1. Clip and clean area\n2. Assess wound depth\n3. Determine closure method' },
          { type: 'heading', content: 'Repair Procedure' },
          { type: 'text', content: '1. Local anesthesia if appropriate\n2. Layer closure if deep\n3. Skin closure with sutures or staples' }
        ]
      }
    ];

    for (const itemData of items) {
      const itemResult = await pool.query(
        'INSERT INTO protocol_items (category_id, title, description) VALUES ($1, $2, $3) RETURNING id',
        [categoryId, itemData.title, itemData.description]
      );
      const itemId = itemResult.rows[0].id;
      console.log(`  ✓ Added: ${itemData.title}`);

      for (const blockData of itemData.blocks) {
        await pool.query(
          'INSERT INTO protocol_blocks (item_id, type, content) VALUES ($1, $2, $3)',
          [itemId, blockData.type, blockData.content]
        );
      }
    }

    console.log('\n✓ Migration complete! Protocol data is ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
