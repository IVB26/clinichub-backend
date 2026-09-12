const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedKBData() {
  try {
    console.log('🌱 Seeding Knowledge Base data...');

    // First, get or create an admin user for created_by_user_id
    const userResult = await pool.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['admin']
    );

    if (userResult.rows.length === 0) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    const adminId = userResult.rows[0].id;

    // Get a category
    const categoryResult = await pool.query(
      'SELECT id FROM kb_categories WHERE name = $1',
      ['Policies']
    );

    if (categoryResult.rows.length === 0) {
      console.error('❌ No categories found. Please ensure KB categories are initialized.');
      process.exit(1);
    }

    const categoryId = categoryResult.rows[0].id;

    // Sample policy document
    const samplePolicy = {
      title: 'Infection Control Policy',
      slug: 'infection-control-policy',
      content_type: 'policy',
      category_id: categoryId,
      description: 'Core infection control procedures and guidelines for all staff',
      body: `
        <h2>Infection Control Policy</h2>
        <p>This policy outlines the procedures for maintaining proper infection control standards across all clinic operations.</p>

        <h3>Key Principles</h3>
        <ul>
          <li>Hand hygiene is essential before and after patient contact</li>
          <li>Personal protective equipment (PPE) must be worn in designated areas</li>
          <li>All instruments must be properly sterilized</li>
          <li>Work surfaces must be disinfected between patients</li>
        </ul>

        <h3>Hand Hygiene Protocol</h3>
        <ol>
          <li>Wash hands with soap and water for at least 20 seconds</li>
          <li>Use hand sanitizer if soap and water are not available</li>
          <li>Clean hands before and after patient contact</li>
          <li>Clean hands before putting on PPE</li>
        </ol>

        <h3>PPE Requirements</h3>
        <p>Staff must wear appropriate PPE when:</p>
        <ul>
          <li>Performing surgical procedures</li>
          <li>Handling contaminated materials</li>
          <li>Working with infectious animals</li>
        </ul>

        <p><strong>Last Updated:</strong> January 2025</p>
      `,
      tags: ['infection-control', 'mandatory', 'health-safety']
    };

    const docResult = await pool.query(
      `INSERT INTO kb_documents (title, slug, content_type, category_id, description, body, tags, version_number, is_published, is_current, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, TRUE, TRUE, $8)
       RETURNING id, title, slug`,
      [samplePolicy.title, samplePolicy.slug, samplePolicy.content_type, samplePolicy.category_id, samplePolicy.description, samplePolicy.body, samplePolicy.tags, adminId]
    );

    const docId = docResult.rows[0].id;
    console.log(`✅ Created sample policy: "${docResult.rows[0].title}" (ID: ${docId})`);

    // Create revision
    await pool.query(
      `INSERT INTO kb_document_revisions (document_id, version_number, title, body, change_summary, changed_by_user_id)
       VALUES ($1, 1, $2, $3, 'Initial version - Sample data', $4)`,
      [docId, samplePolicy.title, samplePolicy.body, adminId]
    );

    console.log('✅ Created revision history');

    // Sample procedure
    const sampleProcedure = {
      title: 'Surgical Preparation Procedure',
      slug: 'surgical-preparation-procedure',
      content_type: 'procedure',
      description: 'Step-by-step procedure for preparing the surgical suite',
      body: `
        <h2>Surgical Preparation Procedure</h2>
        <p>This procedure ensures the surgical suite is properly prepared before each operation.</p>

        <h3>Pre-Operation Checklist (30 minutes before)</h3>
        <ol>
          <li>Clean all surfaces with approved disinfectant</li>
          <li>Set up surgical instruments according to procedure type</li>
          <li>Verify all equipment is functioning properly</li>
          <li>Stock sterile supplies</li>
          <li>Prepare anesthesia equipment</li>
        </ol>

        <h3>During Operation</h3>
        <ul>
          <li>Maintain strict aseptic technique</li>
          <li>Monitor all equipment continuously</li>
          <li>Keep detailed procedure notes</li>
        </ul>
      `,
      tags: ['surgery', 'procedures', 'mandatory']
    };

    const procResult = await pool.query(
      `INSERT INTO kb_documents (title, slug, content_type, category_id, description, body, tags, version_number, is_published, is_current, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, TRUE, TRUE, $8)
       RETURNING id, title`,
      [sampleProcedure.title, sampleProcedure.slug, sampleProcedure.content_type, categoryId, sampleProcedure.description, sampleProcedure.body, sampleProcedure.tags, adminId]
    );

    console.log(`✅ Created sample procedure: "${procResult.rows[0].title}"`);

    console.log('\n🎉 Knowledge Base seed data created successfully!\n');
    console.log('Sample documents:');
    console.log(`  - ${samplePolicy.title}`);
    console.log(`  - ${sampleProcedure.title}`);
    console.log('\nYou can now fetch these via:');
    console.log('  GET /api/kb/documents');
    console.log('  GET /api/kb/documents/:id');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding KB data:', err);
    process.exit(1);
  }
}

seedKBData();
