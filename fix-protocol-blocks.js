const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixProtocolBlocks() {
  try {
    console.log('Converting protocol block content to JSON format...\n');

    // Get all blocks with their current content
    const result = await pool.query('SELECT id, type, content FROM protocol_blocks ORDER BY id');

    for (const block of result.rows) {
      let jsonContent;

      // Convert plain text to proper JSON format based on block type
      if (block.type === 'heading' || block.type === 'h') {
        jsonContent = { text: block.content };
      } else if (block.type === 'text' || block.type === 'p') {
        // For plain text blocks, store as html
        jsonContent = { text: block.content };
      } else if (block.type === 'bullet' || block.type === 'b') {
        jsonContent = { text: block.content };
      } else if (block.type === 'warning' || block.type === 'warn') {
        jsonContent = { text: block.content };
      } else if (block.type === 'tip') {
        jsonContent = { text: block.content };
      } else {
        jsonContent = { text: block.content };
      }

      // Update the block with JSON content
      await pool.query(
        'UPDATE protocol_blocks SET content = $1 WHERE id = $2',
        [JSON.stringify(jsonContent), block.id]
      );
    }

    console.log(`✓ Converted ${result.rows.length} blocks to JSON format`);

    // Verify a few blocks
    const verify = await pool.query(
      `SELECT pb.id, pb.type, pb.content
       FROM protocol_blocks pb
       WHERE pb.item_id IN (SELECT id FROM protocol_items WHERE title = 'Cat Vaccination')
       LIMIT 3`
    );

    console.log('\nSample of updated blocks:');
    verify.rows.forEach((row, idx) => {
      console.log(`Block ${idx + 1}:`);
      console.log(`  Type: ${row.type}`);
      console.log(`  Content: ${JSON.stringify(row.content)}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixProtocolBlocks();
