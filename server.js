const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');
const { scheduleBackups, logBackupEvent } = require('./backup-scheduler');

dotenv.config();

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

// Initialize database on startup
async function initializeDatabase() {
  console.log('=== DATABASE INITIALIZATION STARTED ===');
  try {
    // Note: Protocol tables are preserved to maintain data integrity
    // Remove the lines below only if you need to reset protocol data
    // await pool.query(`DROP TABLE IF EXISTS protocol_sms_templates CASCADE;`).catch(() => {});
    // await pool.query(`DROP TABLE IF EXISTS protocol_forms CASCADE;`).catch(() => {});
    // await pool.query(`DROP TABLE IF EXISTS protocol_blocks CASCADE;`).catch(() => {});
    // await pool.query(`DROP TABLE IF EXISTS protocol_items CASCADE;`).catch(() => {});
    // await pool.query(`DROP TABLE IF EXISTS protocol_categories CASCADE;`).catch(() => {});

    console.log('Starting table initialization...');
    // Check if policies table exists
    const pResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'policies'
      );
    `);

    if (!pResult.rows[0].exists) {
      console.log('Creating policies table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS policies (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          overview TEXT,
          content JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('policies table created successfully');
    } else {
      console.log('policies table already exists');
    }

    // Check if boarding_procedures table exists
    const bpResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'boarding_procedures'
      );
    `);

    if (!bpResult.rows[0].exists) {
      console.log('Creating boarding_procedures table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS boarding_procedures (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          overview TEXT,
          content JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('boarding_procedures table created successfully');
    } else {
      console.log('boarding_procedures table already exists');
    }

    // Check if boarding template table exists
    const bResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'boarding'
      );
    `);

    if (!bResult.rows[0].exists) {
      console.log('Creating boarding (procedures) table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS boarding (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          steps JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('boarding table created successfully');
    } else {
      console.log('boarding table already exists');
    }

    // Check if daily_banking table exists
    const dbResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'daily_banking'
      );
    `);

    if (!dbResult.rows[0].exists) {
      console.log('Creating daily_banking table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_banking (
          id SERIAL PRIMARY KEY,
          entry_date DATE NOT NULL,
          staff_name VARCHAR(255),
          opening_till DECIMAL(10, 2) DEFAULT 0,
          eftpos_machine_total DECIMAL(10, 2) DEFAULT 0,
          eftpos_rx DECIMAL(10, 2) DEFAULT 0,
          zip_afterpay DECIMAL(10, 2) DEFAULT 0,
          direct_debit DECIMAL(10, 2) DEFAULT 0,
          cash_banked DECIMAL(10, 2) DEFAULT 0,
          coins_5c INTEGER DEFAULT 0,
          coins_10c INTEGER DEFAULT 0,
          coins_20c INTEGER DEFAULT 0,
          coins_50c INTEGER DEFAULT 0,
          coins_1 INTEGER DEFAULT 0,
          coins_2 INTEGER DEFAULT 0,
          notes_5 INTEGER DEFAULT 0,
          notes_10 INTEGER DEFAULT 0,
          notes_20 INTEGER DEFAULT 0,
          notes_50 INTEGER DEFAULT 0,
          notes_100 INTEGER DEFAULT 0,
          total_cash_count DECIMAL(10, 2) DEFAULT 0,
          closing_till DECIMAL(10, 2) DEFAULT 0,
          grand_total DECIMAL(10, 2) DEFAULT 0,
          notes TEXT,
          clinic_id VARCHAR(100) DEFAULT 'Coomera',
          created_by_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('daily_banking table created successfully');
    } else {
      console.log('daily_banking table already exists');
    }

    // Check if boarding_times table exists
    const btResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'boarding_times'
      );
    `);

    if (!btResult.rows[0].exists) {
      console.log('Creating boarding_times table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS boarding_times (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          morning_cat_rooms INTEGER DEFAULT 0,
          morning_extra_play_cats INTEGER DEFAULT 0,
          morning_dog_rooms INTEGER DEFAULT 0,
          morning_admits INTEGER DEFAULT 0,
          morning_cleaning INTEGER DEFAULT 30,
          morning_start_time VARCHAR(5),
          morning_total_time INTEGER DEFAULT 0,
          morning_finish_time VARCHAR(5),
          afternoon_cat_rooms INTEGER DEFAULT 0,
          afternoon_dog_rooms INTEGER DEFAULT 0,
          afternoon_admits INTEGER DEFAULT 0,
          afternoon_cleaning INTEGER DEFAULT 30,
          afternoon_start_time VARCHAR(5),
          afternoon_total_time INTEGER DEFAULT 0,
          afternoon_finish_time VARCHAR(5),
          maintenance_cat_rooms INTEGER DEFAULT 0,
          maintenance_dog_rooms INTEGER DEFAULT 0,
          maintenance_total_time INTEGER DEFAULT 0,
          total_daily_time INTEGER DEFAULT 0,
          created_by_id INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('boarding_times table created successfully');
    } else {
      console.log('boarding_times table already exists');
    }

    // Check if boarding_field_multipliers table exists
    const bfmResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'boarding_field_multipliers'
      );
    `);

    if (!bfmResult.rows[0].exists) {
      console.log('Creating boarding_field_multipliers table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS boarding_field_multipliers (
          id SERIAL PRIMARY KEY,
          session VARCHAR(50) NOT NULL,
          field_id VARCHAR(100) NOT NULL,
          field_label VARCHAR(255) NOT NULL,
          multiplier INTEGER DEFAULT 1,
          assigned_time INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(session, field_id)
        );
      `);
      console.log('boarding_field_multipliers table created successfully');
    } else {
      console.log('boarding_field_multipliers table already exists');
      // Add assigned_time column if it doesn't exist
      const checkColumn = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'boarding_field_multipliers' AND column_name = 'assigned_time'
        )
      `);
      if (!checkColumn.rows[0].exists) {
        await pool.query('ALTER TABLE boarding_field_multipliers ADD COLUMN assigned_time INTEGER DEFAULT 0');
        console.log('Added assigned_time column to boarding_field_multipliers');
      }
    }

    // Check if maintenance_field_multipliers table exists
    const mfmResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'maintenance_field_multipliers'
      );
    `);

    if (!mfmResult.rows[0].exists) {
      console.log('Creating maintenance_field_multipliers table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS maintenance_field_multipliers (
          id SERIAL PRIMARY KEY,
          field_id VARCHAR(100) NOT NULL,
          field_label VARCHAR(255) NOT NULL,
          multiplier INTEGER DEFAULT 5,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(field_id)
        );
      `);
      console.log('maintenance_field_multipliers table created successfully');

      // Seed with default maintenance fields
      await pool.query(`
        INSERT INTO maintenance_field_multipliers (field_id, field_label, multiplier, sort_order)
        VALUES ('catRooms', 'Cat Rooms', 5, 0), ('dogRooms', 'Dog Rooms', 5, 1)
        ON CONFLICT DO NOTHING;
      `);
      console.log('Seeded default maintenance fields');
    } else {
      console.log('maintenance_field_multipliers table already exists');

      // Ensure default fields exist
      const countResult = await pool.query('SELECT COUNT(*) FROM maintenance_field_multipliers');
      if (countResult.rows[0].count === 0) {
        await pool.query(`
          INSERT INTO maintenance_field_multipliers (field_id, field_label, multiplier, sort_order)
          VALUES ('catRooms', 'Cat Rooms', 5, 0), ('dogRooms', 'Dog Rooms', 5, 1)
          ON CONFLICT DO NOTHING;
        `);
        console.log('Seeded default maintenance fields');
      }
    }

    // Check if boarding_active table exists
    const baResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'boarding_active'
      );
    `);

    if (!baResult.rows[0].exists) {
      console.log('Creating boarding_active table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS boarding_active (
          id SERIAL PRIMARY KEY,
          animal_name VARCHAR(255) NOT NULL,
          owner_name VARCHAR(255) NOT NULL,
          owner_phone VARCHAR(20),
          animal_type VARCHAR(100),
          check_in_date DATE NOT NULL,
          check_out_date DATE,
          daily_rate DECIMAL(10, 2),
          status VARCHAR(20) DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('boarding_active table created successfully');
    } else {
      console.log('boarding_active table already exists');
    }

    // Check if daily_operations table exists
    const doResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'daily_operations'
      );
    `);

    if (!doResult.rows[0].exists) {
      console.log('Creating daily_operations table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_operations (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          priority INTEGER DEFAULT 3,
          assigned_to VARCHAR(255),
          due_date DATE,
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('daily_operations table created successfully');
    } else {
      console.log('daily_operations table already exists');
      // Add completed_at column if it doesn't exist
      const checkColumn = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'daily_operations' AND column_name = 'completed_at'
        )
      `);
      if (!checkColumn.rows[0].exists) {
        await pool.query('ALTER TABLE daily_operations ADD COLUMN completed_at TIMESTAMP');
        console.log('Added completed_at column to daily_operations');
      }
    }

    // Check if maintenance_schedule table exists
    const msResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'maintenance_schedule'
      );
    `);

    if (!msResult.rows[0].exists) {
      console.log('Creating maintenance_schedule table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS maintenance_schedule (
          id SERIAL PRIMARY KEY,
          equipment_name VARCHAR(255) NOT NULL,
          location VARCHAR(255),
          maintenance_type VARCHAR(100),
          priority INTEGER DEFAULT 3,
          scheduled_date DATE,
          assigned_to VARCHAR(255),
          vendor_name VARCHAR(255),
          vendor_phone VARCHAR(20),
          cost DECIMAL(10, 2),
          description TEXT,
          status VARCHAR(20) DEFAULT 'scheduled',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('maintenance_schedule table created successfully');
    } else {
      console.log('maintenance_schedule table already exists');
    }

    // Check if protocol_categories table exists
    const pcResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'protocol_categories'
      );
    `);

    if (!pcResult.rows[0].exists) {
      console.log('Creating protocol_categories table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS protocol_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          color VARCHAR(50) DEFAULT '#3B82F6',
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('protocol_categories table created successfully');
    } else {
      console.log('protocol_categories table already exists');
    }

    // Check if protocol_items table exists
    const piResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'protocol_items'
      );
    `);

    if (!piResult.rows[0].exists) {
      console.log('Creating protocol_items table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS protocol_items (
          id SERIAL PRIMARY KEY,
          category_id INTEGER REFERENCES protocol_categories(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          default_sms_template_id INTEGER REFERENCES protocol_sms_templates(id) ON DELETE SET NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('protocol_items table created successfully');
    } else {
      console.log('protocol_items table already exists');
      // Check if default_sms_template_id column exists
      const colResult = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='protocol_items' AND column_name='default_sms_template_id'
      `);
      if (colResult.rows.length === 0) {
        console.log('Adding default_sms_template_id column to protocol_items...');
        await pool.query(`
          ALTER TABLE protocol_items ADD COLUMN default_sms_template_id INTEGER REFERENCES protocol_sms_templates(id) ON DELETE SET NULL
        `);
        console.log('default_sms_template_id column added');
      }
    }

    // Check if protocol_blocks table exists
    const pbResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'protocol_blocks'
      );
    `);

    if (!pbResult.rows[0].exists) {
      console.log('Creating protocol_blocks table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS protocol_blocks (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES protocol_items(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255),
          content JSONB,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('protocol_blocks table created successfully');
    } else {
      console.log('protocol_blocks table already exists');
    }

    // Check if protocol_forms table exists
    const pfResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'protocol_forms'
      );
    `);

    if (!pfResult.rows[0].exists) {
      console.log('Creating protocol_forms table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS protocol_forms (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES protocol_items(id) ON DELETE CASCADE,
          title VARCHAR(255),
          questions JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('protocol_forms table created successfully');
    } else {
      console.log('protocol_forms table already exists');
    }

    // Check if protocol_sms_templates table exists
    const pstResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'protocol_sms_templates'
      );
    `);

    if (!pstResult.rows[0].exists) {
      console.log('Creating protocol_sms_templates table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS protocol_sms_templates (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES protocol_items(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('protocol_sms_templates table created successfully');
    } else {
      console.log('protocol_sms_templates table already exists');
    }

    // Create users table
    const uResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (!uResult.rows[0].exists) {
      console.log('Creating users table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'staff',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('users table created successfully');
    } else {
      console.log('users table already exists');
    }

    // Create custom_tabs table
    const ctResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'custom_tabs'
      );
    `);

    if (!ctResult.rows[0].exists) {
      console.log('Creating custom_tabs table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS custom_tabs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(100) UNIQUE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50),
          metadata JSONB,
          location VARCHAR(50) DEFAULT 'top',
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('custom_tabs table created successfully');
    } else {
      console.log('custom_tabs table already exists');
      // Ensure metadata column exists
      await pool.query(`
        ALTER TABLE custom_tabs
        ADD COLUMN IF NOT EXISTS metadata JSONB;
      `).catch(() => {});
      // Ensure location column exists
      await pool.query(`
        ALTER TABLE custom_tabs
        ADD COLUMN IF NOT EXISTS location VARCHAR(50) DEFAULT 'top';
      `).catch(() => {});
      // Ensure key column exists for existing databases (MUST be before seeding)
      await pool.query(`
        ALTER TABLE custom_tabs
        ADD COLUMN IF NOT EXISTS key VARCHAR(100);
      `).catch(() => {});
      // Ensure sort_order column exists
      await pool.query(`
        ALTER TABLE custom_tabs
        ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
      `).catch(() => {});

      // Don't modify existing tabs on startup - only seed built-in tabs if missing

      // Seed built-in tabs on first run only - ensure they exist
      const builtInTabs = [
        { key: 'protocols', name: 'Reception', type: 'builtin', location: 'top' },
        { key: 'policies', name: 'Policies', type: 'builtin', location: 'top' },
        { key: 'boarding', name: 'Boarding', type: 'builtin', location: 'sidebar' },
        { key: 'boarding-times', name: 'Boarding Times', type: 'builtin', location: 'sidebar' },
        { key: 'daily-banking', name: 'Daily Banking', type: 'builtin', location: 'sidebar' },
        { key: 'sms', name: 'SMS', type: 'builtin', location: 'sidebar' },
        { key: 'communications', name: 'Communications', type: 'builtin', location: 'sidebar' },
        { key: 'admin', name: 'Admin', type: 'builtin', location: 'top' },
      ];

      // Delete removed tabs from database (runs every startup)
      console.log('Cleaning up removed tabs...');
      const removedTabKeys = ['operations', 'daily-ops', 'maintenance'];
      for (const key of removedTabKeys) {
        const deleteResult = await pool.query('DELETE FROM custom_tabs WHERE key = $1', [key]);
        if (deleteResult.rowCount > 0) {
          console.log(`✓ Deleted tab: ${key}`);
        }
      }
      console.log('Tab cleanup complete');

      for (const tab of builtInTabs) {
        const existing = await pool.query('SELECT id FROM custom_tabs WHERE key = $1', [tab.key]);
        if (existing.rows.length === 0) {
          await pool.query(
            'INSERT INTO custom_tabs (key, name, type, location, created_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [tab.key, tab.name, tab.type, tab.location]
          );
          console.log(`Seeded built-in tab: ${tab.name}`);
        }
      }
    }

    // Fix blocks without sort_order - initialize them based on creation order
    console.log('Initializing sort_order for blocks without one...');
    const blocksWithoutSort = await pool.query(`
      SELECT DISTINCT item_id FROM protocol_blocks WHERE sort_order IS NULL
    `);

    for (const row of blocksWithoutSort.rows) {
      const itemId = row.item_id;
      const blocks = await pool.query(`
        SELECT id FROM protocol_blocks WHERE item_id = $1 ORDER BY id ASC
      `, [itemId]);

      for (let i = 0; i < blocks.rows.length; i++) {
        await pool.query(`
          UPDATE protocol_blocks SET sort_order = $1 WHERE id = $2
        `, [i, blocks.rows[i].id]);
      }
    }
    console.log('Block sort_order initialization complete');

    // Create custom_tab_forms table
    const cfResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'custom_tab_forms'
      );
    `);

    if (!cfResult.rows[0].exists) {
      console.log('Creating custom_tab_forms table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS custom_tab_forms (
          id SERIAL PRIMARY KEY,
          tab_id INTEGER REFERENCES custom_tabs(id) ON DELETE CASCADE,
          label VARCHAR(255) NOT NULL,
          type VARCHAR(50),
          options JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('custom_tab_forms table created successfully');
    } else {
      console.log('custom_tab_forms table already exists');
    }

    // Create form_submissions table
    const fsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'form_submissions'
      );
    `);

    if (!fsResult.rows[0].exists) {
      console.log('Creating form_submissions table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS form_submissions (
          id SERIAL PRIMARY KEY,
          form_type VARCHAR(100),
          form_id VARCHAR(255),
          patient_name VARCHAR(255),
          data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('form_submissions table created successfully');
    } else {
      console.log('form_submissions table already exists');
    }

    // Create user_settings table
    const usResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_settings'
      );
    `);

    if (!usResult.rows[0].exists) {
      console.log('Creating user_settings table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          setting_key VARCHAR(255),
          setting_value JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('user_settings table created successfully');
    } else {
      console.log('user_settings table already exists');
    }

    // Create checklist_templates table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS checklist_templates (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('checklist_templates table ready');
    } catch (tableErr) {
      console.error('Error creating checklist_templates table:', tableErr);
      throw tableErr;
    }

    // Create checklist_template_items table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS checklist_template_items (
          id SERIAL PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
          task_name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          priority VARCHAR(50),
          question_type VARCHAR(50) DEFAULT 'task',
          options JSONB,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('checklist_template_items table ready');
    } catch (err) {
      console.error('Error creating checklist_template_items:', err);
    }

    // Ensure question_type and options columns exist for existing databases
    try {
      await pool.query(`
        ALTER TABLE checklist_template_items
        ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'task';
      `).catch(() => {});
      await pool.query(`
        ALTER TABLE checklist_template_items
        ADD COLUMN IF NOT EXISTS options JSONB;
      `).catch(() => {});
    } catch (err) {
      console.log('checklist_template_items columns already exist or setup skipped');
    }

    // Create quick_tasks table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS quick_tasks (
          id SERIAL PRIMARY KEY,
          task_name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          priority VARCHAR(50),
          assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('quick_tasks table ready');
    } catch (err) {
      console.error('Error creating quick_tasks:', err);
    }

    // Ensure assigned_to_id column exists for existing databases
    try {
      await pool.query(`
        ALTER TABLE quick_tasks
        ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      `).catch(() => {});
    } catch (err) {
      console.log('assigned_to_id column already exists or setup skipped');
    }

    // Create checklists table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS checklists (
          id SERIAL PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
          checklist_date DATE NOT NULL,
          completed_by_id INTEGER REFERENCES users(id),
          status VARCHAR(50) DEFAULT 'pending',
          completion_percentage INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('checklists table ready');
    } catch (err) {
      console.error('Error creating checklists:', err);
    }

    // Create checklist_items table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS checklist_items (
          id SERIAL PRIMARY KEY,
          checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
          template_item_id INTEGER NOT NULL REFERENCES checklist_template_items(id) ON DELETE CASCADE,
          task_name VARCHAR(255) NOT NULL,
          is_completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP,
          completed_by_id INTEGER REFERENCES users(id),
          answer TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('checklist_items table ready');
    } catch (err) {
      console.error('Error creating checklist_items:', err);
    }

    // Ensure answer column exists for existing databases
    try {
      await pool.query(`
        ALTER TABLE checklist_items
        ADD COLUMN IF NOT EXISTS answer TEXT;
      `).catch(() => {});
    } catch (err) {
      console.log('answer column already exists or setup skipped');
    }

    // Create archived_checklists table for completed checklists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS archived_checklists (
          id SERIAL PRIMARY KEY,
          checklist_id INTEGER NOT NULL UNIQUE REFERENCES checklists(id) ON DELETE CASCADE,
          template_id INTEGER NOT NULL,
          checklist_date DATE NOT NULL,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          items_data JSONB,
          staff_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('archived_checklists table ready');
      // Create index for faster queries by date
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_archived_checklists_date ON archived_checklists(checklist_date DESC);
      `);
    } catch (err) {
      console.error('Error creating archived_checklists:', err);
    }

    // Dashboard sections table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS dashboard_sections (
          id SERIAL PRIMARY KEY,
          section_key VARCHAR(50) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          icon_url TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('dashboard_sections table ready');
    } catch (err) {
      console.error('Error creating dashboard_sections:', err);
    }

    // Dashboard items table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS dashboard_items (
          id SERIAL PRIMARY KEY,
          section_id INTEGER NOT NULL REFERENCES dashboard_sections(id) ON DELETE CASCADE,
          title VARCHAR(255),
          content TEXT,
          content_type VARCHAR(20),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('dashboard_items table ready');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_dashboard_items_section ON dashboard_items(section_id);
      `);
    } catch (err) {
      console.error('Error creating dashboard_items:', err);
    }

    // Seed default sections if they don't exist
    try {
      const sectionsCheck = await pool.query('SELECT COUNT(*) FROM dashboard_sections');
      if (sectionsCheck.rows[0].count === 0) {
        console.log('Seeding default dashboard sections...');
        const sections = [
          { key: 'appointments', title: 'APPOINTMENTS', sort_order: 0 },
          { key: 'staff_knowledge', title: 'STAFF KNOWLEDGE', sort_order: 1 },
          { key: 'client_education', title: 'CLIENT EDUCATION', sort_order: 2 },
          { key: 'policies', title: 'POLICIES & PROCEDURES', sort_order: 3 }
        ];
        for (const section of sections) {
          await pool.query(
            'INSERT INTO dashboard_sections (section_key, title, sort_order) VALUES ($1, $2, $3)',
            [section.key, section.title, section.sort_order]
          );
        }
        console.log('Default sections seeded');
      }
    } catch (err) {
      console.error('Error seeding sections:', err);
    }

    // Content sections table (for dynamic admin-created sections)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS content_sections (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          icon_url TEXT,
          created_by VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('content_sections table ready');
    } catch (err) {
      console.error('Error creating content_sections:', err);
    }

    // Section categories table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS section_categories (
          id SERIAL PRIMARY KEY,
          section_id INTEGER NOT NULL REFERENCES content_sections(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          color VARCHAR(7),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(section_id, name)
        );
      `);
      console.log('section_categories table ready');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_section_categories_section ON section_categories(section_id);
      `);
    } catch (err) {
      console.error('Error creating section_categories:', err);
    }

    // Section items table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS section_items (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES section_categories(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          content_type VARCHAR(20),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('section_items table ready');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_section_items_category ON section_items(category_id);
      `);
    } catch (err) {
      console.error('Error creating section_items:', err);
    }

    // Section blocks table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS section_blocks (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL REFERENCES section_items(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255),
          content JSONB,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('section_blocks table ready');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_section_blocks_item ON section_blocks(item_id);
      `);
    } catch (err) {
      console.error('Error creating section_blocks:', err);
    }

    // Section forms table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS section_forms (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL REFERENCES section_items(id) ON DELETE CASCADE,
          title VARCHAR(255),
          questions JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('section_forms table ready');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_section_forms_item ON section_forms(item_id);
      `);
    } catch (err) {
      console.error('Error creating section_forms:', err);
    }

    // Section SMS templates table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS section_sms_templates (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL REFERENCES section_items(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('section_sms_templates table ready');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_section_sms_item ON section_sms_templates(item_id);
      `);
    } catch (err) {
      console.error('Error creating section_sms_templates:', err);
    }

    // Homepage cards table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS homepage_cards (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          image_url TEXT,
          sort_order INTEGER DEFAULT 0,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('homepage_cards table ready');
    } catch (err) {
      console.error('Error creating homepage_cards:', err);
    }

    // Card tabs mapping table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS card_tabs (
          id SERIAL PRIMARY KEY,
          card_id INTEGER NOT NULL REFERENCES homepage_cards(id) ON DELETE CASCADE,
          tab_id VARCHAR(255) NOT NULL,
          tab_name VARCHAR(255) NOT NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('card_tabs table ready');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_card_tabs_card ON card_tabs(card_id);
      `);
    } catch (err) {
      console.error('Error creating card_tabs:', err);
    }

    // Seed Reception section with default categories if it doesn't exist
    try {
      const receptionCheck = await pool.query('SELECT id FROM content_sections WHERE name = $1', ['Reception']);
      if (receptionCheck.rows.length === 0) {
        console.log('Seeding Reception section with default categories...');

        // Create Reception section
        const sectionResult = await pool.query(
          'INSERT INTO content_sections (name, description, created_by) VALUES ($1, $2, $3) RETURNING id',
          ['Reception', 'Reception management procedures', 'system']
        );
        const sectionId = sectionResult.rows[0].id;

        // Create default categories
        const categories = [
          { name: 'Urgent', color: '#EF4444' },           // Red
          { name: 'Same Day', color: '#F59E0B' },         // Orange
          { name: 'Non-Urgent', color: '#10B981' },       // Green
          { name: 'Rehab', color: '#3B82F6' },            // Blue
          { name: 'General Surgery', color: '#3B82F6' },  // Blue
          { name: 'Miscellaneous', color: '#8B5CF6' }     // Purple
        ];

        for (const cat of categories) {
          await pool.query(
            'INSERT INTO section_categories (section_id, name, color) VALUES ($1, $2, $3)',
            [sectionId, cat.name, cat.color]
          );
        }

        console.log('Reception section seeded successfully');
      }
    } catch (err) {
      console.error('Error seeding Reception section:', err);
    }

    // Migrate old protocol items to Reception section if not already migrated
    try {
      const migrationCheck = await pool.query(
        'SELECT COUNT(*) FROM section_items WHERE id IN (SELECT si.id FROM section_items si JOIN section_categories sc ON si.category_id = sc.id JOIN content_sections cs ON sc.section_id = cs.id WHERE cs.name = $1)',
        ['Reception']
      );

      if (migrationCheck.rows[0].count === 0) {
        console.log('Migrating old protocol items to Reception section...');

        // Get Reception section
        const sectionResult = await pool.query('SELECT id FROM content_sections WHERE name = $1', ['Reception']);
        if (sectionResult.rows.length > 0) {
          const sectionId = sectionResult.rows[0].id;

          // Get old protocol items
          const protocolItems = await pool.query(`
            SELECT pi.*, pc.name as category_name
            FROM protocol_items pi
            LEFT JOIN protocol_categories pc ON pi.category_id = pc.id
            ORDER BY pi.sort_order
          `);

          // Migrate each item
          for (const item of protocolItems.rows) {
            try {
              // Find matching category in new section
              const categoryResult = await pool.query(
                'SELECT id FROM section_categories WHERE section_id = $1 AND name = $2',
                [sectionId, item.category_name]
              );

              if (categoryResult.rows.length > 0) {
                const categoryId = categoryResult.rows[0].id;

                // Insert into section_items
                await pool.query(
                  'INSERT INTO section_items (category_id, title, content, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                  [categoryId, item.title, item.description || '', item.sort_order || 0]
                );
              }
            } catch (err) {
              console.error(`Error migrating item ${item.id}:`, err);
            }
          }

          console.log(`Migrated ${protocolItems.rows.length} items to Reception section`);
        }
      }
    } catch (err) {
      console.error('Error migrating protocol items:', err);
    }

    // Create tab_visibility table
    try {
      const tabVisResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'tab_visibility'
        );
      `);

      if (!tabVisResult.rows[0].exists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS tab_visibility (
            id SERIAL PRIMARY KEY,
            tab_id VARCHAR(255) NOT NULL UNIQUE,
            hidden BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('tab_visibility table created successfully');
      } else {
        console.log('tab_visibility table already exists');
      }
    } catch (err) {
      console.error('Error with tab_visibility table:', err);
    }

    console.log('=== DATABASE INITIALIZATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('=== DATABASE INITIALIZATION FAILED ===', err);
  }
}

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000',
    'https://phenomenal-speculoos-358a70.netlify.app',
    'https://clinichub02.netlify.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'clinichub-dev-secret-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable in production!');
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('No token provided in request');
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token', details: err.message });
    }
    req.user = user;
    next();
  });
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const result = await pool.query(
      'SELECT id, username, password_hash, role, name FROM users WHERE username = $1',
      [username.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message, err.code);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// User Management endpoints
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const result = await pool.query('SELECT id, username, name, role FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { username, name, password, role } = req.body;
    if (!username || !name || !password) {
      return res.status(400).json({ error: 'Username, name, and password required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role',
      [username.toLowerCase(), name, hashedPassword, role || 'staff']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { name, role, password } = req.body;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'UPDATE users SET name = $1, role = $2, password_hash = $3 WHERE id = $4 RETURNING id, username, name, role',
        [name, role, hashedPassword, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(result.rows[0]);
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, role = $2 WHERE id = $3 RETURNING id, username, name, role',
      [name, role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/policies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM policies ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching policies:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/policies', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { title, category, overview, content } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category required' });
    }
    const result = await pool.query(
      'INSERT INTO policies (title, category, overview, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, category, overview, JSON.stringify(content)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating policy:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Boarding Procedures endpoints (mirrors Policies)
app.get('/api/boarding-procedures', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM boarding_procedures ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching boarding procedures:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/boarding-procedures', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { title, category, overview, content } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category required' });
    }
    const result = await pool.query(
      'INSERT INTO boarding_procedures (title, category, overview, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, category, overview, JSON.stringify(content)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating boarding procedure:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/boarding-procedures/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { title, category, overview, content } = req.body;
    const result = await pool.query(
      'UPDATE boarding_procedures SET title = $1, category = $2, overview = $3, content = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [title, category, overview, JSON.stringify(content), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Boarding procedure not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating boarding procedure:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boarding-procedures/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await pool.query('DELETE FROM boarding_procedures WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting boarding procedure:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/sms/send', authenticateToken, async (req, res) => {
  try {
    const { toNumber, body } = req.body;
    if (!toNumber || !body) {
      return res.status(400).json({ error: 'Phone number and message required' });
    }
    const isValidPhone = /^[\d\s\-\+\(\)]{8,}$/.test(toNumber.trim()) && toNumber.replace(/\D/g, "").length >= 8;
    if (!isValidPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
      return res.status(400).json({ error: 'Twilio credentials not configured' });
    }

    // Send SMS via Twilio
    const message = await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber
    });

    // Store in database
    await pool.query(
      'INSERT INTO sms_history (user_id, to_number, body, status) VALUES ($1, $2, $3, $4)',
      [req.user.id, toNumber, body, 'sent']
    );

    res.json({ success: true, message: 'SMS sent', sid: message.sid });
  } catch (err) {
    console.error('SMS error:', err);
    res.status(500).json({ error: 'Failed to send SMS: ' + err.message });
  }
});

// Boarding endpoints
app.get('/api/boarding', authenticateToken, async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const result = await pool.query(
      'SELECT * FROM boarding_active WHERE status = $1 ORDER BY check_in_date DESC',
      [status]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching boarding:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/boarding', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { animal_name, owner_name, owner_phone, animal_type, check_in_date, daily_rate, notes } = req.body;
    if (!animal_name || !owner_name || !check_in_date) {
      return res.status(400).json({ error: 'Animal name, owner name, and check-in date required' });
    }
    const result = await pool.query(
      'INSERT INTO boarding_active (animal_name, owner_name, owner_phone, animal_type, check_in_date, daily_rate, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [animal_name, owner_name, owner_phone, animal_type, check_in_date, daily_rate, notes, 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating boarding:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/boarding/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { check_out_date, status, notes } = req.body;
    const result = await pool.query(
      'UPDATE boarding_active SET check_out_date = $1, status = $2, notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [check_out_date, status, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Boarding record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating boarding:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boarding/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM boarding_active WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting boarding:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Daily Operations endpoints
app.get('/api/operations', authenticateToken, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const result = await pool.query(
      'SELECT * FROM daily_operations WHERE status = $1 ORDER BY priority DESC, due_date ASC',
      [status]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching operations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/operations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { title, description, category, priority, assigned_to, due_date, notes } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category required' });
    }
    const result = await pool.query(
      'INSERT INTO daily_operations (title, description, category, priority, assigned_to, due_date, notes, created_by_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [title, description, category, priority || 'medium', assigned_to, due_date, notes, req.user.id, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating operation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/operations/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { status, notes, assigned_to } = req.body;
    const completed_at = status === 'completed' ? new Date().toISOString() : null;
    const result = await pool.query(
      'UPDATE daily_operations SET status = $1, notes = $2, assigned_to = $3, completed_at = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [status, notes, assigned_to, completed_at, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating operation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/operations/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM daily_operations WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting operation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Banking endpoints
app.get('/api/banking', authenticateToken, async (req, res) => {
  try {
    const { record_date, record_type } = req.query;
    let query = 'SELECT * FROM banking_records WHERE 1=1';
    const params = [];

    if (record_date) {
      query += ' AND record_date = $' + (params.length + 1);
      params.push(record_date);
    }
    if (record_type) {
      query += ' AND record_type = $' + (params.length + 1);
      params.push(record_type);
    }

    query += ' ORDER BY record_date DESC, created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching banking records:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/banking', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { record_date, record_type, category, description, amount, payment_method, notes } = req.body;
    if (!record_date || !record_type || !amount) {
      return res.status(400).json({ error: 'Date, type, and amount required' });
    }
    const result = await pool.query(
      'INSERT INTO banking_records (record_date, record_type, category, description, amount, payment_method, notes, created_by_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [record_date, record_type, category, description, amount, payment_method, notes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating banking record:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/banking/summary/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const result = await pool.query(
      'SELECT record_type, SUM(amount) as total FROM banking_records WHERE record_date = $1 GROUP BY record_type',
      [date]
    );
    const summary = { income: 0, expense: 0, other: 0 };
    result.rows.forEach(row => {
      summary[row.record_type] = parseFloat(row.total) || 0;
    });
    res.json(summary);
  } catch (err) {
    console.error('Error fetching banking summary:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/banking/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM banking_records WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting banking record:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Maintenance endpoints
app.get('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const { status = 'scheduled' } = req.query;
    const result = await pool.query(
      'SELECT * FROM maintenance_schedule WHERE status = $1 ORDER BY scheduled_date ASC, priority DESC',
      [status]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching maintenance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { equipment_name, location, maintenance_type, priority, scheduled_date, assigned_to, vendor_name, vendor_phone, cost, description, notes } = req.body;
    if (!equipment_name || !scheduled_date) {
      return res.status(400).json({ error: 'Equipment name and scheduled date required' });
    }
    const result = await pool.query(
      'INSERT INTO maintenance_schedule (equipment_name, location, maintenance_type, priority, scheduled_date, assigned_to, vendor_name, vendor_phone, cost, description, notes, created_by_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [equipment_name, location, maintenance_type || 'Regular', priority || 'medium', scheduled_date, assigned_to, vendor_name, vendor_phone, cost, description, notes, req.user.id, 'scheduled']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating maintenance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/maintenance/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { status, notes, completed_date } = req.body;
    const completed_at = status === 'completed' ? (completed_date || new Date().toISOString().split('T')[0]) : null;
    const result = await pool.query(
      'UPDATE maintenance_schedule SET status = $1, notes = $2, completed_date = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, notes, completed_at, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating maintenance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/maintenance/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM maintenance_schedule WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting maintenance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Communications endpoints
app.get('/api/communications', authenticateToken, async (req, res) => {
  try {
    const { type = 'sms' } = req.query;
    const result = await pool.query(
      'SELECT * FROM communications WHERE type = $1 ORDER BY created_at DESC LIMIT 100',
      [type]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching communications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/communications', authenticateToken, async (req, res) => {
  try {
    const { type, to_number, message, status } = req.body;
    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message required' });
    }
    const result = await pool.query(
      'INSERT INTO communications (type, to_number, message, status, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [type, to_number, message, status || 'sent', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating communication:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Daily Banking endpoints
app.get('/api/daily-banking', authenticateToken, async (req, res) => {
  try {
    const { date, clinic_id } = req.query;
    let query = 'SELECT * FROM daily_banking WHERE 1=1';
    const params = [];

    if (date) {
      query += ' AND DATE(entry_date) = $' + (params.length + 1);
      params.push(date);
    }
    if (clinic_id) {
      query += ' AND clinic_id = $' + (params.length + 1);
      params.push(clinic_id);
    }

    query += ' ORDER BY entry_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching daily banking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/daily-banking', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const {
      date,
      staffName,
      openingTill,
      eftposMachineTotal,
      eftposRx,
      zip,
      directDebit,
      cashBanked,
      coins5c,
      coins10c,
      coins20c,
      coins50c,
      coins1,
      coins2,
      notes5,
      notes10,
      notes20,
      notes50,
      notes100,
      closingTill,
      totalCashCount,
      notes
    } = req.body;

    if (!date || !staffName) {
      return res.status(400).json({ error: 'Date and staff name required' });
    }

    const grandTotal = (eftposMachineTotal || 0) + (directDebit || 0) + (cashBanked || 0);

    const result = await pool.query(
      `INSERT INTO daily_banking (
        entry_date, staff_name, opening_till, eftpos_machine_total, eftpos_rx, zip_afterpay,
        direct_debit, cash_banked, coins_5c, coins_10c, coins_20c, coins_50c, coins_1, coins_2,
        notes_5, notes_10, notes_20, notes_50, notes_100, total_cash_count, closing_till,
        grand_total, notes, created_by_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24
      ) RETURNING *`,
      [
        date,
        staffName,
        openingTill || 0,
        eftposMachineTotal || 0,
        eftposRx || 0,
        zip || 0,
        directDebit || 0,
        cashBanked || 0,
        coins5c || 0,
        coins10c || 0,
        coins20c || 0,
        coins50c || 0,
        coins1 || 0,
        coins2 || 0,
        notes5 || 0,
        notes10 || 0,
        notes20 || 0,
        notes50 || 0,
        notes100 || 0,
        totalCashCount || 0,
        closingTill || 0,
        grandTotal,
        notes || '',
        req.user.id
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating daily banking entry:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/daily-banking/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const {
      date,
      staffName,
      openingTill,
      eftposMachineTotal,
      eftposRx,
      zip,
      directDebit,
      cashBanked,
      coins5c,
      coins10c,
      coins20c,
      coins50c,
      coins1,
      coins2,
      notes5,
      notes10,
      notes20,
      notes50,
      notes100,
      closingTill,
      totalCashCount,
      notes
    } = req.body;

    const grandTotal = (eftposMachineTotal || 0) + (directDebit || 0) + (cashBanked || 0);

    const result = await pool.query(
      `UPDATE daily_banking SET
        entry_date = $1, staff_name = $2, opening_till = $3, eftpos_machine_total = $4,
        eftpos_rx = $5, zip_afterpay = $6, direct_debit = $7, cash_banked = $8,
        coins_5c = $9, coins_10c = $10, coins_20c = $11, coins_50c = $12,
        coins_1 = $13, coins_2 = $14, notes_5 = $15, notes_10 = $16,
        notes_20 = $17, notes_50 = $18, notes_100 = $19, total_cash_count = $20,
        closing_till = $21, grand_total = $22, notes = $23, updated_at = CURRENT_TIMESTAMP
      WHERE id = $24 RETURNING *`,
      [
        date,
        staffName,
        openingTill || 0,
        eftposMachineTotal || 0,
        eftposRx || 0,
        zip || 0,
        directDebit || 0,
        cashBanked || 0,
        coins5c || 0,
        coins10c || 0,
        coins20c || 0,
        coins50c || 0,
        coins1 || 0,
        coins2 || 0,
        notes5 || 0,
        notes10 || 0,
        notes20 || 0,
        notes50 || 0,
        notes100 || 0,
        totalCashCount || 0,
        closingTill || 0,
        grandTotal,
        notes || '',
        id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Daily banking record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating daily banking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/daily-banking/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM daily_banking WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting daily banking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Boarding Times endpoints
app.get('/api/boarding-times', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM boarding_times WHERE 1=1';
    const params = [];

    if (date) {
      query += ' AND DATE(date) = $' + (params.length + 1);
      params.push(date);
    }

    query += ' ORDER BY date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching boarding times:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/boarding-times', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const {
      date,
      morningCatRooms,
      morningExtraPlayCats,
      morningDogRooms,
      morningAdmits,
      morningCleaning,
      morningStartTime,
      morningTotalTime,
      morningFinishTime,
      afternoonCatRooms,
      afternoonDogRooms,
      afternoonAdmits,
      afternoonCleaning,
      afternoonStartTime,
      afternoonTotalTime,
      afternoonFinishTime,
      maintenanceCatRooms,
      maintenanceDogRooms,
      maintenanceTotalTime,
      totalDailyTime
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date required' });
    }

    const result = await pool.query(
      `INSERT INTO boarding_times (
        date, morning_cat_rooms, morning_extra_play_cats, morning_dog_rooms, morning_admits,
        morning_cleaning, morning_start_time, morning_total_time, morning_finish_time,
        afternoon_cat_rooms, afternoon_dog_rooms, afternoon_admits, afternoon_cleaning,
        afternoon_start_time, afternoon_total_time, afternoon_finish_time,
        maintenance_cat_rooms, maintenance_dog_rooms, maintenance_total_time,
        total_daily_time, created_by_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        date,
        morningCatRooms || 0,
        morningExtraPlayCats || 0,
        morningDogRooms || 0,
        morningAdmits || 0,
        morningCleaning || 0,
        morningStartTime,
        morningTotalTime || 0,
        morningFinishTime,
        afternoonCatRooms || 0,
        afternoonDogRooms || 0,
        afternoonAdmits || 0,
        afternoonCleaning || 0,
        afternoonStartTime,
        afternoonTotalTime || 0,
        afternoonFinishTime,
        maintenanceCatRooms || 0,
        maintenanceDogRooms || 0,
        maintenanceTotalTime || 0,
        totalDailyTime || 0,
        req.user.id
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating boarding times record:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/boarding-times/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM boarding_times WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting boarding times:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Boarding Field Multipliers endpoints
app.get('/api/boarding-field-multipliers', authenticateToken, async (req, res) => {
  try {
    const { session } = req.query;
    let query = 'SELECT * FROM boarding_field_multipliers WHERE 1=1';
    const params = [];

    if (session) {
      query += ' AND session = $' + (params.length + 1);
      params.push(session);
    }

    query += ' ORDER BY sort_order ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching boarding field multipliers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/boarding-field-multipliers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { session, fields } = req.body;

    if (!session || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Session and fields array required' });
    }

    // Delete existing fields for this session
    await pool.query('DELETE FROM boarding_field_multipliers WHERE session = $1', [session]);

    // Insert new fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      await pool.query(
        `INSERT INTO boarding_field_multipliers (session, field_id, field_label, multiplier, assigned_time, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session, field_id) DO UPDATE SET
         field_label = $3, multiplier = $4, assigned_time = $5, sort_order = $6, updated_at = CURRENT_TIMESTAMP`,
        [session, field.id, field.label, field.multiplier || 1, field.assignedTime || 0, field.sortOrder || i]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving boarding field multipliers:', err.message, err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.put('/api/boarding-field-multipliers/:session/:fieldId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { session, fieldId } = req.params;
    const { assignedTime } = req.body;

    if (assignedTime === undefined) {
      return res.status(400).json({ error: 'assignedTime required' });
    }

    const result = await pool.query(
      `UPDATE boarding_field_multipliers SET assigned_time = $1, updated_at = CURRENT_TIMESTAMP
       WHERE session = $2 AND field_id = $3 RETURNING *`,
      [assignedTime, session, fieldId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating assigned time:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Maintenance field multipliers endpoints
app.get('/api/maintenance-field-multipliers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, field_id, field_label, multiplier, sort_order
       FROM maintenance_field_multipliers
       ORDER BY sort_order ASC`
    );
    res.json(result.rows.map(row => ({
      id: row.field_id,
      label: row.field_label,
      multiplier: row.multiplier,
      sortOrder: row.sort_order
    })));
  } catch (err) {
    console.error('Error fetching maintenance field multipliers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/maintenance-field-multipliers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return res.status(400).json({ error: 'Fields array required' });
    }

    // Delete existing fields
    await pool.query('DELETE FROM maintenance_field_multipliers');

    // Insert new fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      await pool.query(
        `INSERT INTO maintenance_field_multipliers (field_id, field_label, multiplier, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [field.id, field.label, field.multiplier || 5, field.sortOrder || i]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving maintenance field multipliers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.1.0-final',
    hasTestEndpoint: true,
    hasDiagEndpoint: true,
    hasProtocolEndpoint: true,
    buildTime: '2026-08-08T05:45:00Z',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint - returns static data (no DB query)
app.get('/api/test', authenticateToken, async (req, res) => {
  console.log('[TEST] Test endpoint called');
  res.json({
    test: 'success',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Diagnostic endpoint - check database
app.get('/api/diag/db', authenticateToken, async (req, res) => {
  try {
    const tables = ['protocol_items', 'protocol_blocks', 'protocol_forms', 'protocol_sms_templates'];
    const status = {};

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        status[table] = { exists: true, rows: result.rows[0].count };
      } catch (err) {
        status[table] = { exists: false, error: err.message };
      }
    }

    // Try to fetch item 1 specifically
    try {
      const item = await pool.query('SELECT * FROM protocol_items WHERE id = $1', [1]);
      status.item_1 = { found: item.rows.length > 0, title: item.rows[0]?.title };
    } catch (err) {
      status.item_1 = { error: err.message };
    }

    res.json({ database: status, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Repair endpoint - reinitialize database
app.post('/repair', async (req, res) => {
  try {
    console.log('Starting database repair...');

    // Drop and recreate custom_tab_forms
    await pool.query('DROP TABLE IF EXISTS custom_tab_forms CASCADE');
    console.log('Dropped custom_tab_forms');

    // Recreate with correct types
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_tab_forms (
        id SERIAL PRIMARY KEY,
        tab_id INTEGER REFERENCES custom_tabs(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        options JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Recreated custom_tab_forms with correct types');

    res.json({ success: true, message: 'Database repair completed' });
  } catch (err) {
    console.error('Repair error:', err.message);
    res.status(500).json({ error: 'Repair failed', details: err.message });
  }
});

// ============ PROTOCOL MANAGEMENT ENDPOINTS ============

// Middleware to log all protocol requests
app.use('/api/protocols', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - User: ${req.user?.id || 'unknown'}`);
  next();
});

// Get all categories
app.get('/api/protocols/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM protocol_categories ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
app.post('/api/protocols/categories', authenticateToken, async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO protocol_categories (name, color) VALUES ($1, $2) RETURNING *',
      [name, color]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
app.put('/api/protocols/categories/:id', authenticateToken, async (req, res) => {
  const { name, color, sort_order } = req.body;
  try {
    const result = await pool.query(
      'UPDATE protocol_categories SET name = $1, color = $2, sort_order = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, color, sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
app.delete('/api/protocols/categories/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM protocol_categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get items by category
app.get('/api/protocols/categories/:categoryId/items', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM protocol_items WHERE category_id = $1 ORDER BY sort_order',
      [req.params.categoryId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Create item
app.post('/api/protocols/items', authenticateToken, async (req, res) => {
  const { category_id, title, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO protocol_items (category_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [category_id, title, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Get item with all blocks and forms
app.get('/api/protocols/items/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`[DEBUG] Fetching protocol item ${req.params.id}`);

    console.log('[DEBUG] Querying protocol_items...');
    const itemResult = await pool.query('SELECT * FROM protocol_items WHERE id = $1', [req.params.id]);
    console.log('[DEBUG] protocol_items query OK');

    console.log('[DEBUG] Querying protocol_blocks...');
    const blocksResult = await pool.query('SELECT * FROM protocol_blocks WHERE item_id = $1 ORDER BY sort_order', [req.params.id]);
    console.log('[DEBUG] protocol_blocks query OK - returned', blocksResult.rows.length, 'blocks');
    if (blocksResult.rows.length > 0) {
      console.log('[DEBUG] Block sort_orders:', blocksResult.rows.map(b => `id:${b.id}->sort_order:${b.sort_order}`).join(', '));
    }

    console.log('[DEBUG] Querying protocol_forms...');
    const formsResult = await pool.query('SELECT * FROM protocol_forms WHERE item_id = $1', [req.params.id]);
    console.log('[DEBUG] protocol_forms query OK');

    console.log('[DEBUG] Querying protocol_sms_templates...');
    const smsResult = await pool.query('SELECT * FROM protocol_sms_templates WHERE item_id = $1', [req.params.id]);
    console.log('[DEBUG] protocol_sms_templates query OK');

    console.log('[DEBUG] All queries successful, returning response');
    res.json({
      item: itemResult.rows[0],
      blocks: blocksResult.rows,
      forms: formsResult.rows,
      smsTemplates: smsResult.rows
    });
  } catch (err) {
    console.error('❌ ERROR fetching item:', err.message, '| Code:', err.code);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Failed to fetch item', details: err.message, code: err.code });
  }
});

// Update item
app.put('/api/protocols/items/:id', authenticateToken, async (req, res) => {
  const { title, description, sort_order, default_sms_template_id } = req.body;
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }
    if (default_sms_template_id !== undefined) {
      updates.push(`default_sms_template_id = $${paramCount++}`);
      values.push(default_sms_template_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const query = `UPDATE protocol_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
app.delete('/api/protocols/items/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM protocol_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Create block
app.post('/api/protocols/blocks', authenticateToken, async (req, res) => {
  const { item_id, type, content } = req.body;
  try {
    const maxSort = await pool.query('SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM protocol_blocks WHERE item_id = $1', [item_id]);
    const nextSort = (maxSort.rows[0]?.max_sort || -1) + 1;

    const result = await pool.query(
      'INSERT INTO protocol_blocks (item_id, type, content, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [item_id, type, JSON.stringify(content), nextSort]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating block:', err);
    res.status(500).json({ error: 'Failed to create block' });
  }
});

// Update block
app.put('/api/protocols/blocks/:id', authenticateToken, async (req, res) => {
  const { content, sort_order } = req.body;
  const blockId = req.params.id;

  try {
    console.log('\n========== BLOCK UPDATE DEBUG ==========');
    console.log('📝 REQUEST RECEIVED');
    console.log('  Block ID:', blockId);
    console.log('  Content:', typeof content === 'string' ? content.substring(0, 100) : JSON.stringify(content).substring(0, 100));
    console.log('  New sort_order:', sort_order);
    console.log('  Request user:', req.user?.id);

    // First, check what's currently in the database for this block
    console.log('\n📊 CURRENT STATE IN DB');
    const beforeQuery = await pool.query('SELECT id, sort_order, content FROM protocol_blocks WHERE id = $1', [blockId]);
    if (beforeQuery.rows.length > 0) {
      console.log('  Current sort_order:', beforeQuery.rows[0].sort_order);
    } else {
      console.log('  ❌ BLOCK NOT FOUND IN DATABASE');
    }

    // Execute the update
    console.log('\n⚙️ EXECUTING UPDATE');
    console.log('  Query: UPDATE protocol_blocks SET content = $1, sort_order = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *');
    console.log('  Parameters: [$1=content, $2=' + sort_order + ', $3=' + blockId + ']');

    const result = await pool.query(
      'UPDATE protocol_blocks SET content = $1, sort_order = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [JSON.stringify(content), sort_order, blockId]
    );

    console.log('\n📤 UPDATE RESULT');
    console.log('  Rows affected:', result.rowCount);
    console.log('  Returned row:', result.rows.length > 0 ? {
      id: result.rows[0].id,
      sort_order: result.rows[0].sort_order,
      updated_at: result.rows[0].updated_at
    } : 'NONE');

    // Verify the update actually persisted
    console.log('\n✅ VERIFICATION QUERY');
    const verifyQuery = await pool.query('SELECT id, sort_order FROM protocol_blocks WHERE id = $1', [blockId]);
    if (verifyQuery.rows.length > 0) {
      console.log('  Verified sort_order in DB:', verifyQuery.rows[0].sort_order);
      console.log('  ✓ Update verified!');
    } else {
      console.log('  ❌ Block disappeared after update!');
    }

    console.log('========== END DEBUG ==========\n');

    res.json(result.rows[0]);
  } catch (err) {
    console.error('\n❌ ERROR UPDATING BLOCK');
    console.error('  Error message:', err.message);
    console.error('  Error code:', err.code);
    console.error('  Full error:', err);
    res.status(500).json({ error: 'Failed to update block', details: err.message });
  }
});

// Delete block
app.delete('/api/protocols/blocks/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM protocol_blocks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting block:', err);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

// Cleanup: Delete all blocks (for rebuild)
app.delete('/api/protocols/blocks-cleanup', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM protocol_blocks');
    console.log('Cleaned up protocol_blocks');
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('Error cleaning up blocks:', err);
    res.status(500).json({ error: 'Failed to cleanup blocks' });
  }
});

// Create/Update form
app.post('/api/protocols/forms', authenticateToken, async (req, res) => {
  const { item_id, title, questions } = req.body;
  try {
    let result = await pool.query('SELECT * FROM protocol_forms WHERE item_id = $1', [item_id]);

    if (result.rows.length > 0) {
      // Update existing form
      result = await pool.query(
        'UPDATE protocol_forms SET title = $1, questions = $2, updated_at = CURRENT_TIMESTAMP WHERE item_id = $3 RETURNING *',
        [title, JSON.stringify(questions), item_id]
      );
    } else {
      // Create new form
      result = await pool.query(
        'INSERT INTO protocol_forms (item_id, title, questions) VALUES ($1, $2, $3) RETURNING *',
        [item_id, title, JSON.stringify(questions)]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving form:', err);
    res.status(500).json({ error: 'Failed to save form' });
  }
});

// Delete form
app.delete('/api/protocols/forms/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM protocol_forms WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting form:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// Create SMS template
app.post('/api/protocols/sms-templates', authenticateToken, async (req, res) => {
  const { item_id, name, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO protocol_sms_templates (item_id, name, content) VALUES ($1, $2, $3) RETURNING *',
      [item_id, name, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating SMS template:', err);
    res.status(500).json({ error: 'Failed to create SMS template' });
  }
});

// Update SMS template
app.put('/api/protocols/sms-templates/:id', authenticateToken, async (req, res) => {
  const { name, content } = req.body;
  try {
    const result = await pool.query(
      'UPDATE protocol_sms_templates SET name = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, content, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating SMS template:', err);
    res.status(500).json({ error: 'Failed to update SMS template' });
  }
});

// Delete SMS template
app.delete('/api/protocols/sms-templates/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM protocol_sms_templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting SMS template:', err);
    res.status(500).json({ error: 'Failed to delete SMS template' });
  }
});

// Send SMS from protocol item
app.post('/api/protocols/send-sms', authenticateToken, async (req, res) => {
  const { phone_number, item_id } = req.body;

  if (!twilioClient) {
    return res.status(400).json({ error: 'SMS service not configured' });
  }

  try {
    const itemResult = await pool.query('SELECT default_sms_template_id FROM protocol_items WHERE id = $1', [item_id]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const templateId = itemResult.rows[0].default_sms_template_id;
    if (!templateId) {
      return res.status(404).json({ error: 'No SMS template configured for this item' });
    }

    const templateResult = await pool.query('SELECT * FROM protocol_sms_templates WHERE id = $1', [templateId]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    await twilioClient.messages.create({
      body: template.content,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone_number
    });

    res.json({ success: true, message: 'SMS sent successfully' });
  } catch (err) {
    console.error('Error sending SMS:', err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// ==================== CUSTOM TABS ====================
app.get('/api/custom-tabs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM custom_tabs ORDER BY sort_order ASC, created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching custom tabs:', err);
    res.status(500).json({ error: 'Failed to fetch custom tabs' });
  }
});

app.post('/api/custom-tabs', authenticateToken, async (req, res) => {
  try {
    const { name, type, metadata, location } = req.body;
    const maxSortResult = await pool.query('SELECT MAX(sort_order) as max_sort FROM custom_tabs');
    const nextSort = (maxSortResult.rows[0].max_sort || -1) + 1;
    const result = await pool.query(
      'INSERT INTO custom_tabs (name, type, metadata, location, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, metadata ? JSON.stringify(metadata) : null, location || 'top', nextSort]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating custom tab:', err);
    res.status(500).json({ error: 'Failed to create custom tab' });
  }
});

app.put('/api/custom-tabs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, metadata, location, sort_order } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(metadata ? JSON.stringify(metadata) : null);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE custom_tabs SET ${updates.join(', ')} WHERE id::text = $${paramCount} OR key = $${paramCount} RETURNING *`;
    let result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating custom tab:', err);
    res.status(500).json({ error: 'Failed to update custom tab' });
  }
});

app.delete('/api/custom-tabs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM custom_tabs WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting custom tab:', err);
    res.status(500).json({ error: 'Failed to delete custom tab' });
  }
});

// ==================== CHECKLIST TEMPLATES ====================
app.get('/api/checklist-templates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM checklist_templates ORDER BY sort_order, name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.post('/api/checklist-templates', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO checklist_templates (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

app.put('/api/checklist-templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order } = req.body;
    const result = await pool.query(
      'UPDATE checklist_templates SET name = $1, description = $2, sort_order = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description, sort_order, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

app.delete('/api/checklist-templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM checklist_templates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ==================== CHECKLIST TEMPLATE ITEMS ====================
app.get('/api/checklist-templates/:templateId/items', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const result = await pool.query(
      'SELECT * FROM checklist_template_items WHERE template_id = $1 ORDER BY sort_order',
      [templateId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching template items:', err);
    res.status(500).json({ error: 'Failed to fetch template items' });
  }
});

app.post('/api/checklist-templates/:templateId/items', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { task_name, category, priority, question_type, options } = req.body;
    const result = await pool.query(
      'INSERT INTO checklist_template_items (template_id, task_name, category, priority, question_type, options) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [templateId, task_name, category, priority, question_type || 'task', options ? JSON.stringify(options) : null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating template item:', err);
    res.status(500).json({ error: 'Failed to create template item' });
  }
});

app.put('/api/checklist-template-items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { task_name, category, priority, sort_order, question_type, options } = req.body;
    const result = await pool.query(
      'UPDATE checklist_template_items SET task_name = $1, category = $2, priority = $3, sort_order = $4, question_type = $5, options = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [task_name, category, priority, sort_order, question_type || 'task', options ? JSON.stringify(options) : null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating template item:', err);
    res.status(500).json({ error: 'Failed to update template item' });
  }
});

app.delete('/api/checklist-template-items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM checklist_template_items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting template item:', err);
    res.status(500).json({ error: 'Failed to delete template item' });
  }
});

// ==================== QUICK TASKS ====================
app.get('/api/quick-tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT qt.*, u.username as assigned_to_name
      FROM quick_tasks qt
      LEFT JOIN users u ON qt.assigned_to_id = u.id
      ORDER BY qt.sort_order, qt.task_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quick tasks:', err);
    res.status(500).json({ error: 'Failed to fetch quick tasks' });
  }
});

app.post('/api/quick-tasks', authenticateToken, async (req, res) => {
  try {
    const { task_name, category, priority, assigned_to_id } = req.body;
    const result = await pool.query(
      'INSERT INTO quick_tasks (task_name, category, priority, assigned_to_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [task_name, category, priority, assigned_to_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating quick task:', err);
    res.status(500).json({ error: 'Failed to create quick task' });
  }
});

app.put('/api/quick-tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { task_name, category, priority, sort_order, assigned_to_id } = req.body;
    const result = await pool.query(
      'UPDATE quick_tasks SET task_name = $1, category = $2, priority = $3, sort_order = $4, assigned_to_id = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [task_name, category, priority, sort_order, assigned_to_id || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating quick task:', err);
    res.status(500).json({ error: 'Failed to update quick task' });
  }
});

app.delete('/api/quick-tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM quick_tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting quick task:', err);
    res.status(500).json({ error: 'Failed to delete quick task' });
  }
});

// ==================== CHECKLISTS (Completed Instances) ====================
app.get('/api/checklists', authenticateToken, async (req, res) => {
  try {
    const { templateId, date } = req.query;
    let query = 'SELECT c.*, ct.name as template_name FROM checklists c JOIN checklist_templates ct ON c.template_id = ct.id WHERE 1=1';
    const params = [];

    if (templateId) {
      params.push(templateId);
      query += ` AND c.template_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND c.checklist_date = $${params.length}`;
    }

    query += ' ORDER BY c.checklist_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching checklists:', err);
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
});

app.get('/api/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, ct.name as template_name
       FROM checklists c
       JOIN checklist_templates ct ON c.template_id = ct.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const checklist = result.rows[0];
    const itemsResult = await pool.query(
      'SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY id',
      [id]
    );

    res.json({ ...checklist, items: itemsResult.rows });
  } catch (err) {
    console.error('Error fetching checklist:', err);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

app.post('/api/checklists', authenticateToken, async (req, res) => {
  try {
    const { template_id, checklist_date, completed_by_id } = req.body;
    const result = await pool.query(
      'INSERT INTO checklists (template_id, checklist_date, completed_by_id) VALUES ($1, $2, $3) RETURNING *',
      [template_id, checklist_date, completed_by_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating checklist:', err);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

// ==================== CHECKLIST ITEMS ====================
app.put('/api/checklist-items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_completed, completed_by_id, answer } = req.body;
    const completedAt = is_completed ? new Date() : null;

    const result = await pool.query(
      'UPDATE checklist_items SET is_completed = $1, completed_at = $2, completed_by_id = $3, answer = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [is_completed, completedAt, completed_by_id, answer || null, id]
    );

    // Update checklist completion percentage
    const itemResult = await pool.query('SELECT checklist_id FROM checklist_items WHERE id = $1', [id]);
    if (itemResult.rows.length > 0) {
      const checklistId = itemResult.rows[0].checklist_id;
      const statsResult = await pool.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_completed OR answer IS NOT NULL THEN 1 ELSE 0 END) as completed
        FROM checklist_items
        WHERE checklist_id = $1
      `, [checklistId]);
      const stats = statsResult.rows[0];
      const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

      await pool.query(
        'UPDATE checklists SET completion_percentage = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [percentage, percentage === 100 ? 'completed' : 'in_progress', checklistId]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating checklist item:', err);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// Helper endpoint to create checklist with all items from template
app.post('/api/checklists-from-template', authenticateToken, async (req, res) => {
  try {
    const { template_id, checklist_date, completed_by_id } = req.body;

    // Create the checklist
    const checklistResult = await pool.query(
      'INSERT INTO checklists (template_id, checklist_date, completed_by_id) VALUES ($1, $2, $3) RETURNING *',
      [template_id, checklist_date, completed_by_id]
    );
    const checklist = checklistResult.rows[0];

    // Get template items
    const itemsResult = await pool.query(
      'SELECT * FROM checklist_template_items WHERE template_id = $1 ORDER BY sort_order',
      [template_id]
    );

    // Create checklist items from template
    const createdItems = [];
    for (const item of itemsResult.rows) {
      const createdResult = await pool.query(
        'INSERT INTO checklist_items (checklist_id, template_item_id, task_name) VALUES ($1, $2, $3) RETURNING *',
        [checklist.id, item.id, item.task_name]
      );
      createdItems.push(createdResult.rows[0]);
    }

    res.json({ ...checklist, items: createdItems });
  } catch (err) {
    console.error('Error creating checklist from template:', err);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

// Finalize and archive a completed checklist
app.post('/api/checklists/:id/finalize', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { staffName, itemsData } = req.body;

    // Get the checklist info
    const checklistResult = await pool.query(
      'SELECT * FROM checklists WHERE id = $1',
      [id]
    );

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const checklist = checklistResult.rows[0];

    // Archive the completed checklist
    await pool.query(
      `INSERT INTO archived_checklists (checklist_id, template_id, checklist_date, items_data, staff_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (checklist_id) DO UPDATE SET items_data = $4, staff_name = $5, updated_at = CURRENT_TIMESTAMP`,
      [id, checklist.template_id, checklist.checklist_date, JSON.stringify(itemsData), staffName]
    );

    res.json({ success: true, message: 'Checklist archived successfully' });
  } catch (err) {
    console.error('Error finalizing checklist:', err);
    res.status(500).json({ error: 'Failed to finalize checklist' });
  }
});

// Get archived checklists by date
app.get('/api/archived-checklists', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query; // Format: YYYY-MM-DD

    let query = 'SELECT * FROM archived_checklists ORDER BY completed_at DESC';
    const params = [];

    if (date) {
      query = 'SELECT * FROM archived_checklists WHERE checklist_date = $1 ORDER BY completed_at DESC';
      params.push(date);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching archived checklists:', err);
    res.status(500).json({ error: 'Failed to fetch archived checklists' });
  }
});

// ==================== CUSTOM TAB FORMS ====================
app.get('/api/custom-tab-forms/:tabId', authenticateToken, async (req, res) => {
  try {
    const { tabId } = req.params;
    const result = await pool.query(
      'SELECT * FROM custom_tab_forms WHERE tab_id = $1 ORDER BY created_at',
      [tabId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching form questions:', err);
    res.status(500).json({ error: 'Failed to fetch form questions' });
  }
});

app.post('/api/custom-tab-forms', authenticateToken, async (req, res) => {
  try {
    const { tab_id, label, type, options } = req.body;
    const result = await pool.query(
      'INSERT INTO custom_tab_forms (tab_id, label, type, options) VALUES ($1, $2, $3, $4) RETURNING *',
      [tab_id, label, type, options || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating form question:', err);
    res.status(500).json({ error: 'Failed to create form question' });
  }
});

app.put('/api/custom-tab-forms/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, type, options } = req.body;
    const result = await pool.query(
      'UPDATE custom_tab_forms SET label = $1, type = $2, options = $3 WHERE id = $4 RETURNING *',
      [label, type, options || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating form question:', err);
    res.status(500).json({ error: 'Failed to update form question' });
  }
});

app.delete('/api/custom-tab-forms/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM custom_tab_forms WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting form question:', err);
    res.status(500).json({ error: 'Failed to delete form question' });
  }
});

// ==================== FORM SUBMISSIONS ====================
app.get('/api/form-submissions', authenticateToken, async (req, res) => {
  try {
    const { form_type, form_id } = req.query;
    let query = 'SELECT * FROM form_submissions';
    const params = [];

    if (form_type) {
      query += ` WHERE form_type = $${params.length + 1}`;
      params.push(form_type);
      if (form_id) {
        query += ` AND form_id = $${params.length + 1}`;
        params.push(form_id);
      }
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching form submissions:', err);
    res.status(500).json({ error: 'Failed to fetch form submissions' });
  }
});

app.post('/api/form-submissions', authenticateToken, async (req, res) => {
  try {
    const { form_type, form_id, patient_name, data } = req.body;
    const result = await pool.query(
      'INSERT INTO form_submissions (form_type, form_id, patient_name, data) VALUES ($1, $2, $3, $4) RETURNING *',
      [form_type, form_id, patient_name, JSON.stringify(data)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving form submission:', err);
    res.status(500).json({ error: 'Failed to save form submission' });
  }
});

app.delete('/api/form-submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM form_submissions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting form submission:', err);
    res.status(500).json({ error: 'Failed to delete form submission' });
  }
});

// ==================== USER SETTINGS ====================
app.get('/api/user-settings/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT setting_key, setting_value FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching user settings:', err);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

app.put('/api/user-settings/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO user_settings (user_id, setting_key, setting_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, setting_key) DO UPDATE SET setting_value = $3`,
        [userId, key, JSON.stringify(value)]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating user settings:', err);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Seed protocols (admin only)
app.post('/api/admin/seed-protocols', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Ensure protocol tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocol_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT '#3B82F6',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    const protocolData = [
      {
        name: 'Surgery Protocols',
        items: [
          {
            title: 'Spay/Neuter Protocol',
            description: 'Standard spay and neuter surgical procedure guidelines',
            blocks: [
              { type: 'heading', content: 'Pre-Operative Preparation' },
              { type: 'text', content: '1. Pre-surgical bloodwork required for all animals over 7 years\\n2. NPO (nothing by mouth) 8-12 hours before surgery\\n3. IV catheter placement\\n4. Administer pre-anesthetic medications as per anesthesia protocol' }
            ]
          }
        ]
      },
      {
        name: 'Vaccination Guidelines',
        items: [
          {
            title: 'Puppy Vaccination Schedule',
            description: 'Core and non-core vaccination protocols for puppies',
            blocks: [
              { type: 'heading', content: 'Age 6-8 Weeks' },
              { type: 'text', content: '• DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)\\n• Bordetella (intranasal)\\n• Fecal exam and deworming' }
            ]
          }
        ]
      }
    ];

    let seedCount = 0;
    for (const categoryData of protocolData) {
      const categoryResult = await pool.query(
        'INSERT INTO protocol_categories (name) VALUES ($1) RETURNING id',
        [categoryData.name]
      );
      const categoryId = categoryResult.rows[0].id;

      for (const itemData of categoryData.items) {
        const itemResult = await pool.query(
          'INSERT INTO protocol_items (category_id, title, description) VALUES ($1, $2, $3) RETURNING id',
          [categoryId, itemData.title, itemData.description]
        );
        const itemId = itemResult.rows[0].id;
        seedCount++;

        for (let idx = 0; idx < itemData.blocks.length; idx++) {
          const blockData = itemData.blocks[idx];
          await pool.query(
            'INSERT INTO protocol_blocks (item_id, type, content, sort_order) VALUES ($1, $2, $3, $4)',
            [itemId, blockData.type, blockData.content, idx]
          );
        }
      }
    }

    res.json({ success: true, message: `Seeded ${seedCount} protocol items` });
  } catch (err) {
    console.error('Error seeding protocols:', err.message, err.code);
    res.status(500).json({
      error: 'Failed to seed protocols',
      details: err.message,
      code: err.code
    });
  }
});

// =============================================
// BACKUP & RESTORE ENDPOINTS (Admin only)
// =============================================

app.post('/api/admin/backup/export', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { execSync } = require('child_process');
    const result = execSync('node backup-protocols.js export', {
      cwd: __dirname,
      encoding: 'utf8'
    });

    logBackupEvent(`Manual backup triggered by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Backup export completed successfully',
      output: result
    });
  } catch (err) {
    console.error('Backup export error:', err);
    logBackupEvent(`Backup export failed: ${err.message}`);
    res.status(500).json({
      error: 'Backup export failed',
      details: err.message
    });
  }
});

app.get('/api/admin/backup/list', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const backupDir = path.join(__dirname, 'backups');
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('protocol-backup-') && f.endsWith('.json') && !f.includes('latest'))
      .sort()
      .reverse()
      .map(f => {
        const filepath = path.join(backupDir, f);
        const stats = fs.statSync(filepath);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return {
          filename: f,
          timestamp: data.timestamp,
          size: stats.size,
          items: data.metadata.totalItems,
          blocks: data.metadata.totalBlocks,
          forms: data.metadata.totalForms
        };
      });

    res.json({ success: true, backups });
  } catch (err) {
    console.error('Backup list error:', err);
    res.status(500).json({ error: 'Failed to list backups', details: err.message });
  }
});

app.post('/api/admin/backup/restore', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { backupFilename } = req.body;

    if (!backupFilename) {
      return res.status(400).json({ error: 'backupFilename required' });
    }

    // Validate filename to prevent directory traversal
    if (backupFilename.includes('..') || backupFilename.includes('/')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }

    const { execSync } = require('child_process');
    const result = execSync(`node backup-protocols.js restore ${backupFilename}`, {
      cwd: __dirname,
      encoding: 'utf8'
    });

    logBackupEvent(`Backup restored by ${req.user.username}: ${backupFilename}`);

    res.json({
      success: true,
      message: 'Backup restored successfully',
      output: result
    });
  } catch (err) {
    console.error('Backup restore error:', err);
    logBackupEvent(`Backup restore failed: ${err.message}`);
    res.status(500).json({
      error: 'Backup restore failed',
      details: err.message
    });
  }
});

app.post('/api/admin/backup/verify', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { backupFilename } = req.body;
    const { execSync } = require('child_process');

    const verifyCmd = backupFilename
      ? `node backup-protocols.js verify ${backupFilename}`
      : 'node backup-protocols.js verify';

    const result = execSync(verifyCmd, {
      cwd: __dirname,
      encoding: 'utf8'
    });

    res.json({
      success: true,
      message: 'Backup verification passed',
      output: result
    });
  } catch (err) {
    console.error('Backup verify error:', err);
    res.status(400).json({
      error: 'Backup verification failed',
      details: err.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, async () => {
  console.log(`[SERVER] ClinicHub backend listening on port ${port}`);
  console.log(`[STARTUP] Beginning database initialization...`);
  try {
    await initializeDatabase();
    console.log(`[STARTUP] Database initialization complete - server is now ready`);
  } catch (err) {
    console.error(`[STARTUP] Failed to initialize database:`, err);
  }

  // Start backup scheduler
  try {
    scheduleBackups();
  } catch (err) {
    console.warn('⚠️  Backup scheduler failed to start:', err.message);
  }

  // Start checklist cleanup job (delete checklists older than 30 days - runs daily at 3 AM UTC)
  try {
    const cron = require('node-cron');
    cron.schedule('0 3 * * *', async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const result = await pool.query(
          'DELETE FROM checklists WHERE checklist_date < $1',
          [thirtyDaysAgo]
        );
        if (result.rowCount > 0) {
          console.log(`🧹 Checklist cleanup: Deleted ${result.rowCount} checklists older than 30 days`);
        }
      } catch (err) {
        console.error('Checklist cleanup failed:', err.message);
      }
    });
    console.log('🧹 Checklist cleanup scheduler started (runs daily at 3 AM UTC)');
  } catch (err) {
    console.warn('⚠️  Checklist cleanup scheduler failed to start:', err.message);
  }
});

// ==================== DASHBOARD ENDPOINTS ====================

// Get all dashboard sections with their items
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ds.*,
        json_agg(json_build_object(
          'id', di.id,
          'title', di.title,
          'content', di.content,
          'content_type', di.content_type,
          'sort_order', di.sort_order,
          'created_at', di.created_at
        ) ORDER BY di.sort_order) FILTER (WHERE di.id IS NOT NULL) as items
      FROM dashboard_sections ds
      LEFT JOIN dashboard_items di ON ds.id = di.section_id
      GROUP BY ds.id, ds.section_key, ds.title, ds.icon_url, ds.sort_order
      ORDER BY ds.sort_order
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Add item to dashboard section
app.post('/api/dashboard/:sectionId/items', authenticateToken, async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { title, content, content_type } = req.body;

    const result = await pool.query(
      `INSERT INTO dashboard_items (section_id, title, content, content_type, sort_order)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM dashboard_items WHERE section_id = $1))
       RETURNING *`,
      [sectionId, title || '', content || '', content_type || 'text']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding dashboard item:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update dashboard item
app.put('/api/dashboard/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, content, content_type } = req.body;

    const result = await pool.query(
      `UPDATE dashboard_items
       SET title = $2, content = $3, content_type = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [itemId, title, content, content_type]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating dashboard item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete dashboard item
app.delete('/api/dashboard/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await pool.query(
      'DELETE FROM dashboard_items WHERE id = $1 RETURNING id',
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting dashboard item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Update section icon
app.put('/api/dashboard/sections/:sectionId/icon', authenticateToken, async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { icon_url } = req.body;

    const result = await pool.query(
      `UPDATE dashboard_sections
       SET icon_url = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [sectionId, icon_url]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating section icon:', err);
    res.status(500).json({ error: 'Failed to update icon' });
  }
});

// ==================== CONTENT SECTIONS ENDPOINTS ====================

// Get all content sections with their categories and items
app.get('/api/content-sections', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cs.*,
        json_agg(json_build_object(
          'id', sc.id,
          'name', sc.name,
          'color', sc.color,
          'sort_order', sc.sort_order,
          'items', (
            SELECT json_agg(json_build_object(
              'id', si.id,
              'title', si.title,
              'content', si.content,
              'content_type', si.content_type,
              'sort_order', si.sort_order
            ) ORDER BY si.sort_order)
            FROM section_items si
            WHERE si.category_id = sc.id
          )
        ) ORDER BY sc.sort_order) FILTER (WHERE sc.id IS NOT NULL) as categories
      FROM content_sections cs
      LEFT JOIN section_categories sc ON cs.id = sc.section_id
      WHERE cs.is_active = true
      GROUP BY cs.id
      ORDER BY cs.sort_order, cs.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching content sections:', err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Get single content section by ID with categories and items
app.get('/api/content-sections/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cs.*,
        json_agg(json_build_object(
          'id', sc.id,
          'name', sc.name,
          'color', sc.color,
          'sort_order', sc.sort_order,
          'items', (
            SELECT json_agg(json_build_object(
              'id', si.id,
              'title', si.title,
              'content', si.content,
              'content_type', si.content_type,
              'sort_order', si.sort_order,
              'category_id', si.category_id
            ) ORDER BY si.sort_order)
            FROM section_items si
            WHERE si.category_id = sc.id
          )
        ) ORDER BY sc.sort_order) FILTER (WHERE sc.id IS NOT NULL) as categories
      FROM content_sections cs
      LEFT JOIN section_categories sc ON cs.id = sc.section_id
      WHERE cs.id = $1
      GROUP BY cs.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching section:', err);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

// Create content section (admin only)
app.post('/api/content-sections', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { name, description, icon_url } = req.body;

    const result = await pool.query(
      `INSERT INTO content_sections (name, description, icon_url, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, icon_url, req.user.username]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating content section:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Section name already exists' });
    }
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Update content section (admin only)
app.put('/api/content-sections/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { id } = req.params;
    const { name, description, icon_url, is_active } = req.body;

    const result = await pool.query(
      `UPDATE content_sections
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           icon_url = COALESCE($4, icon_url),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, name, description, icon_url, is_active]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating content section:', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete content section (admin only)
app.delete('/api/content-sections/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { id } = req.params;
    console.log(`Attempting to delete section ${id}`);

    const result = await pool.query(
      'DELETE FROM content_sections WHERE id = $1 RETURNING id',
      [id]
    );

    console.log(`Delete result:`, result.rows);

    if (result.rows.length === 0) {
      console.log(`Section ${id} not found`);
      return res.status(404).json({ error: 'Section not found' });
    }

    console.log(`✓ Section ${id} deleted successfully`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting content section:', err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Create category (admin only)
app.post('/api/content-sections/:sectionId/categories', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { sectionId } = req.params;
    const { name, color } = req.body;

    const result = await pool.query(
      `INSERT INTO section_categories (section_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sectionId, name, color || '#3B82F6']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (admin only)
app.put('/api/content-sections/categories/:categoryId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { categoryId } = req.params;
    const { name, color } = req.body;

    const result = await pool.query(
      `UPDATE section_categories
       SET name = COALESCE($2, name),
           color = COALESCE($3, color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [categoryId, name, color]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (admin only)
app.delete('/api/content-sections/categories/:categoryId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { categoryId } = req.params;

    const result = await pool.query(
      'DELETE FROM section_categories WHERE id = $1 RETURNING id',
      [categoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Create item (admin only)
app.post('/api/content-sections/categories/:categoryId/items', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { categoryId } = req.params;
    const { title, content, content_type } = req.body;

    const result = await pool.query(
      `INSERT INTO section_items (category_id, title, content, content_type, sort_order)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM section_items WHERE category_id = $1))
       RETURNING *`,
      [categoryId, title, content, content_type || 'text']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item (admin only)
app.put('/api/content-sections/items/:itemId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { itemId } = req.params;
    const { title, content, content_type } = req.body;

    const result = await pool.query(
      `UPDATE section_items
       SET title = COALESCE($2, title),
           content = COALESCE($3, content),
           content_type = COALESCE($4, content_type),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [itemId, title, content, content_type]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item (admin only)
app.delete('/api/content-sections/items/:itemId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { itemId } = req.params;

    const result = await pool.query(
      'DELETE FROM section_items WHERE id = $1 RETURNING id',
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ===================== BLOCKS FOR SECTION ITEMS =====================

// Get item with blocks
app.get('/api/content-sections/items/:itemId/full', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get the item
    const itemResult = await pool.query('SELECT * FROM section_items WHERE id = $1', [itemId]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemResult.rows[0];

    // Get blocks
    const blocksResult = await pool.query(
      'SELECT * FROM section_blocks WHERE item_id = $1 ORDER BY sort_order',
      [itemId]
    );

    console.log('Fetching blocks for item', itemId, '- found', blocksResult.rows.length, 'blocks');
    blocksResult.rows.forEach(block => {
      console.log('Block', block.id, '- type:', block.type, '- contentType:', typeof block.content, '- contentKeys:', Object.keys(block.content || {}));
    });

    // Get forms
    const formsResult = await pool.query(
      'SELECT * FROM section_forms WHERE item_id = $1',
      [itemId]
    );

    // Get SMS templates
    const smsResult = await pool.query(
      'SELECT * FROM section_sms_templates WHERE item_id = $1',
      [itemId]
    );

    res.json({
      ...item,
      blocks: blocksResult.rows,
      forms: formsResult.rows,
      sms_templates: smsResult.rows
    });
  } catch (err) {
    console.error('Error fetching item with blocks:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create block
app.post('/api/content-sections/items/:itemId/blocks', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { itemId } = req.params;
    const { type, title, content } = req.body;

    // Get max sort_order for this item
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM section_blocks WHERE item_id = $1',
      [itemId]
    );
    const sort_order = maxOrderResult.rows[0].max_order + 1;

    // Convert content object to JSON string for storage
    const contentString = typeof content === 'string' ? content : JSON.stringify(content || {});

    const result = await pool.query(
      'INSERT INTO section_blocks (item_id, type, title, content, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [itemId, type, title || '', contentString, sort_order]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating block:', err);
    res.status(500).json({ error: 'Failed to create block' });
  }
});

// Update block
app.put('/api/content-sections/blocks/:blockId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { blockId } = req.params;
    const { type, title, content } = req.body;

    console.log('Updating block:', { blockId, type, title, contentType: typeof content, contentKeys: Object.keys(content || {}) });

    // Convert content object to JSON string for storage
    const contentString = typeof content === 'string' ? content : JSON.stringify(content || {});

    const result = await pool.query(
      'UPDATE section_blocks SET type = $1, title = $2, content = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [type, title, contentString, blockId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating block:', err);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

// Delete block
app.delete('/api/content-sections/blocks/:blockId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { blockId } = req.params;

    const result = await pool.query(
      'DELETE FROM section_blocks WHERE id = $1 RETURNING id',
      [blockId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting block:', err);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

// Reorder block
app.put('/api/content-sections/blocks/:blockId/reorder', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { blockId } = req.params;
    const { sort_order } = req.body;

    const result = await pool.query(
      'UPDATE section_blocks SET sort_order = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [sort_order, blockId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error reordering block:', err);
    res.status(500).json({ error: 'Failed to reorder block' });
  }
});

// ===================== FORMS FOR SECTION ITEMS =====================

// Create form for item
app.post('/api/content-sections/items/:itemId/forms', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { itemId } = req.params;
    const { title, questions } = req.body;

    const result = await pool.query(
      'INSERT INTO section_forms (item_id, title, questions) VALUES ($1, $2, $3) RETURNING *',
      [itemId, title || 'Form', questions || []]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating form:', err);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// Get forms for item
app.get('/api/content-sections/items/:itemId/forms', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await pool.query(
      'SELECT * FROM section_forms WHERE item_id = $1 ORDER BY created_at DESC',
      [itemId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching forms:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// Update form
app.put('/api/content-sections/forms/:formId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { formId } = req.params;
    const { title, questions } = req.body;

    const result = await pool.query(
      'UPDATE section_forms SET title = $1, questions = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [title, questions, formId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating form:', err);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// Delete form
app.delete('/api/content-sections/forms/:formId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { formId } = req.params;

    const result = await pool.query(
      'DELETE FROM section_forms WHERE id = $1 RETURNING id',
      [formId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting form:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// ===================== SMS TEMPLATES FOR SECTION ITEMS =====================

// Create SMS template for item
app.post('/api/content-sections/items/:itemId/sms-templates', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { itemId } = req.params;
    const { name, content } = req.body;

    const result = await pool.query(
      'INSERT INTO section_sms_templates (item_id, name, content) VALUES ($1, $2, $3) RETURNING *',
      [itemId, name || 'SMS Template', content || '']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating SMS template:', err);
    res.status(500).json({ error: 'Failed to create SMS template' });
  }
});

// Get SMS templates for item
app.get('/api/content-sections/items/:itemId/sms-templates', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await pool.query(
      'SELECT * FROM section_sms_templates WHERE item_id = $1 ORDER BY created_at DESC',
      [itemId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching SMS templates:', err);
    res.status(500).json({ error: 'Failed to fetch SMS templates' });
  }
});

// Update SMS template
app.put('/api/content-sections/sms-templates/:templateId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { templateId } = req.params;
    const { name, content } = req.body;

    const result = await pool.query(
      'UPDATE section_sms_templates SET name = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, content, templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SMS template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating SMS template:', err);
    res.status(500).json({ error: 'Failed to update SMS template' });
  }
});

// Delete SMS template
app.delete('/api/content-sections/sms-templates/:templateId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { templateId } = req.params;

    const result = await pool.query(
      'DELETE FROM section_sms_templates WHERE id = $1 RETURNING id',
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SMS template not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting SMS template:', err);
    res.status(500).json({ error: 'Failed to delete SMS template' });
  }
});

// Get all homepage cards
app.get('/api/homepage/cards', authenticateToken, async (req, res) => {
  try {
    const cardsResult = await pool.query(`
      SELECT id, title, image_url, sort_order, created_at, updated_at
      FROM homepage_cards
      ORDER BY sort_order ASC
    `);

    const cardsWithTabs = await Promise.all(
      cardsResult.rows.map(async (card) => {
        const tabsResult = await pool.query(
          'SELECT id, tab_id, tab_name FROM card_tabs WHERE card_id = $1 ORDER BY sort_order',
          [card.id]
        );
        return { ...card, tabs: tabsResult.rows };
      })
    );

    res.json(cardsWithTabs);
  } catch (err) {
    console.error('Error fetching homepage cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Create homepage card
app.post('/api/homepage/cards', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { title, image_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const result = await pool.query(
      'INSERT INTO homepage_cards (title, image_url, created_by) VALUES ($1, $2, $3) RETURNING *',
      [title, image_url, req.user.username]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating card:', err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update homepage card
app.put('/api/homepage/cards/:cardId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { cardId } = req.params;
    const { title, image_url, sort_order } = req.body;

    const result = await pool.query(
      'UPDATE homepage_cards SET title = $1, image_url = $2, sort_order = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [title, image_url, sort_order, cardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete homepage card
app.delete('/api/homepage/cards/:cardId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { cardId } = req.params;
    const result = await pool.query(
      'DELETE FROM homepage_cards WHERE id = $1 RETURNING id',
      [cardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting card:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Add tabs to card
app.post('/api/homepage/cards/:cardId/tabs', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { cardId } = req.params;
    const { tab_id, tab_name } = req.body;

    const result = await pool.query(
      'INSERT INTO card_tabs (card_id, tab_id, tab_name) VALUES ($1, $2, $3) RETURNING *',
      [cardId, tab_id, tab_name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding tab:', err);
    res.status(500).json({ error: 'Failed to add tab' });
  }
});

// Remove tab from card
app.delete('/api/homepage/cards/:cardId/tabs/:tabId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { cardId, tabId } = req.params;
    const result = await pool.query(
      'DELETE FROM card_tabs WHERE card_id = $1 AND id = $2 RETURNING id',
      [cardId, tabId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error removing tab:', err);
    res.status(500).json({ error: 'Failed to remove tab' });
  }
});

// Get tab configuration (location and sort order)
app.get('/api/tab-config', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, key, name, type, location, sort_order, metadata
      FROM custom_tabs
      ORDER BY sort_order ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tab config:', err);
    res.status(500).json({ error: 'Failed to fetch tab configuration' });
  }
});

// Update tab configuration (admin only)
app.put('/api/tab-config/:tabId', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update tab configuration' });
    }

    const { tabId } = req.params;
    const { location, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE custom_tabs
       SET location = $1, sort_order = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [location, sort_order, tabId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating tab config:', err);
    res.status(500).json({ error: 'Failed to update tab configuration' });
  }
});

// Full-text search across all content sections, items, and blocks
app.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const keywords = q.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    const results = [];

    // Search section items and their blocks
    const itemsResult = await pool.query(`
      SELECT
        si.id as item_id,
        si.title as item_title,
        si.content as item_content,
        si.description,
        sc.name as category_name,
        cs.id as section_id,
        cs.name as section_name,
        sb.content as block_content,
        sb.title as block_title
      FROM section_items si
      LEFT JOIN section_categories sc ON si.category_id = sc.id
      LEFT JOIN content_sections cs ON sc.section_id = cs.id
      LEFT JOIN section_blocks sb ON si.id = sb.item_id
      WHERE cs.is_active = true
      LIMIT 1000
    `);

    const itemMap = {};
    itemsResult.rows.forEach(row => {
      const key = `${row.section_id}-${row.item_id}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          type: row.section_name,
          title: row.item_title,
          category: row.category_name,
          id: row.item_id,
          searchText: [
            row.item_title,
            row.category_name,
            row.item_content,
            row.description
          ].filter(Boolean).join(' ').toLowerCase()
        };
      }
      // Add block content to searchText
      if (row.block_content || row.block_title) {
        const blockContent = typeof row.block_content === 'string'
          ? row.block_content.replace(/<[^>]*>/g, '')
          : (row.block_content ? JSON.stringify(row.block_content) : '');
        itemMap[key].searchText += ' ' + blockContent + ' ' + (row.block_title || '');
      }
    });

    // Calculate scores for each item
    Object.values(itemMap).forEach(item => {
      let score = 0;
      keywords.forEach(keyword => {
        if (item.title.toLowerCase().includes(keyword)) score += 100;
        if (item.category && item.category.toLowerCase().includes(keyword)) score += 50;
        if (item.searchText.includes(keyword)) score += 25;
      });
      if (score > 0) {
        results.push({
          ...item,
          score: score,
          searchText: undefined // Don't return full text
        });
      }
    });

    // Search Policies & Procedures
    const policiesResult = await pool.query('SELECT id, title, category, overview, content FROM policies');
    policiesResult.rows.forEach(policy => {
      let score = 0;
      const searchText = [policy.title, policy.category, policy.overview, policy.content].filter(Boolean).join(' ').toLowerCase();
      keywords.forEach(keyword => {
        if (policy.title.toLowerCase().includes(keyword)) score += 100;
        if (policy.category && policy.category.toLowerCase().includes(keyword)) score += 50;
        if (searchText.includes(keyword)) score += 25;
      });
      if (score > 0) {
        results.push({
          type: 'Policies',
          title: policy.title,
          category: policy.category,
          id: policy.id,
          score: score
        });
      }
    });

    // Search Boarding Procedures
    const boardingResult = await pool.query('SELECT id, title, category, overview, content FROM boarding_procedures');
    boardingResult.rows.forEach(boarding => {
      let score = 0;
      const searchText = [boarding.title, boarding.category, boarding.overview, boarding.content].filter(Boolean).join(' ').toLowerCase();
      keywords.forEach(keyword => {
        if (boarding.title.toLowerCase().includes(keyword)) score += 100;
        if (boarding.category && boarding.category.toLowerCase().includes(keyword)) score += 50;
        if (searchText.includes(keyword)) score += 25;
      });
      if (score > 0) {
        results.push({
          type: 'Boarding',
          title: boarding.title,
          category: boarding.category,
          id: boarding.id,
          score: score
        });
      }
    });

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    res.json(results.slice(0, 50));
  } catch (err) {
    console.error('Error performing search:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get all tab visibility settings
app.get('/api/tab-visibility', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT tab_id, hidden FROM tab_visibility');
    const visibility = {};
    result.rows.forEach(row => {
      visibility[row.tab_id] = row.hidden;
    });
    res.json(visibility);
  } catch (err) {
    console.error('Error fetching tab visibility:', err);
    res.status(500).json({ error: 'Failed to fetch tab visibility' });
  }
});

// Update tab visibility (hide/show)
app.put('/api/tab-visibility/:tabId', authenticateToken, async (req, res) => {
  const { tabId } = req.params;
  const { hidden } = req.body;

  try {
    await pool.query(
      'INSERT INTO tab_visibility (tab_id, hidden) VALUES ($1, $2) ON CONFLICT (tab_id) DO UPDATE SET hidden = $2, updated_at = CURRENT_TIMESTAMP',
      [tabId, hidden]
    );
    res.json({ success: true, tab_id: tabId, hidden });
  } catch (err) {
    console.error('Error updating tab visibility:', err);
    res.status(500).json({ error: 'Failed to update tab visibility' });
  }
});

module.exports = app;
