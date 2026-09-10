const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedWorkflows() {
  try {
    console.log('Creating workflow tables...');

    // Create workflow_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_templates (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        task_sequence JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ workflow_templates table created');

    // Create workflow_instances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_instances (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL REFERENCES workflow_templates(id),
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        due_date DATE,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ workflow_instances table created');

    // Create workflow_tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_tasks (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        assigned_to INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ workflow_tasks table created');

    // Check if templates already exist
    const check = await pool.query(
      'SELECT COUNT(*) as count FROM workflow_templates WHERE clinic_id = 1'
    );

    if (check.rows[0].count === 0) {
      console.log('Seeding default templates...');

      await pool.query(
        'INSERT INTO workflow_templates (clinic_id, name, description, task_sequence) VALUES ($1, $2, $3, $4::jsonb)',
        [1, 'Maintenance Request', 'Standard maintenance workflow for facility issues', JSON.stringify([
          {"id":1,"title":"Report Issue","status":"pending"},
          {"id":2,"title":"Assess Damage","status":"pending"},
          {"id":3,"title":"Repair","status":"pending"},
          {"id":4,"title":"Verify","status":"pending"}
        ])]
      );

      await pool.query(
        'INSERT INTO workflow_templates (clinic_id, name, description, task_sequence) VALUES ($1, $2, $3, $4::jsonb)',
        [1, 'Staff Onboarding', 'New staff member onboarding process', JSON.stringify([
          {"id":1,"title":"Prepare Workspace","status":"pending"},
          {"id":2,"title":"System Access","status":"pending"},
          {"id":3,"title":"Training","status":"pending"},
          {"id":4,"title":"Documentation","status":"pending"}
        ])]
      );

      await pool.query(
        'INSERT INTO workflow_templates (clinic_id, name, description, task_sequence) VALUES ($1, $2, $3, $4::jsonb)',
        [1, 'Incident Investigation', 'Document and investigate incidents', JSON.stringify([
          {"id":1,"title":"Report Incident","status":"pending"},
          {"id":2,"title":"Initial Assessment","status":"pending"},
          {"id":3,"title":"Witness Statements","status":"pending"},
          {"id":4,"title":"Root Cause Analysis","status":"pending"},
          {"id":5,"title":"Corrective Actions","status":"pending"}
        ])]
      );

      console.log('✓ Default templates seeded');
    } else {
      console.log('✓ Templates already exist, skipping seed');
    }

    console.log('\n✅ Workflow setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message || err);
    console.error('Full error:', err);
    if (!process.env.DATABASE_URL) {
      console.error('\n⚠️  DATABASE_URL environment variable not set!');
      console.error('Make sure .env file exists and contains DATABASE_URL');
    }
    process.exit(1);
  }
}

seedWorkflows();
