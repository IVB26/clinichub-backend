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

      // Fix corrupted tab names (where JSON object got stored as name)
      try {
        const corruptedTabs = await pool.query(`
          SELECT id, name FROM custom_tabs WHERE name LIKE '{%' AND name LIKE '%}'
        `);
        for (const tab of corruptedTabs.rows) {
          try {
            const parsed = JSON.parse(tab.name);
            if (parsed.name) {
              await pool.query(
                'UPDATE custom_tabs SET name = $1 WHERE id = $2',
                [parsed.name, tab.id]
              );
              console.log(`Fixed corrupted tab ${tab.id}: ${parsed.name}`);
            }
          } catch (e) {
            console.log(`Could not parse corrupted tab ${tab.id}: ${tab.name}`);
          }
        }
      } catch (err) {
        console.log('Corruption check failed:', err.message);
      }

      // Only clean up duplicates if they exist (don't delete on every startup)
      try {
        const dupCheckResult = await pool.query(`
          SELECT COUNT(*) as count FROM (
            SELECT key, COUNT(*) FROM custom_tabs WHERE key IS NOT NULL GROUP BY key HAVING COUNT(*) > 1
          ) duplicates
        `);
        const dupCount = parseInt(dupCheckResult.rows[0].count);
        if (dupCount > 0) {
          console.log(`Found duplicates, cleaning up...`);
          // Delete duplicates, keep only the latest one per key
          await pool.query(`
            DELETE FROM custom_tabs WHERE id NOT IN (
              SELECT id FROM (
                SELECT DISTINCT ON (key) id FROM custom_tabs
                WHERE key IS NOT NULL
                ORDER BY key, created_at DESC
              ) latest
            ) AND key IS NOT NULL
          `);
          console.log(`Cleaned up duplicate tabs`);
        }
      } catch (err) {
        console.log('Duplicate cleanup check failed:', err.message);
      }

      // Seed built-in tabs if they don't exist
      const builtInTabs = [
        { key: 'protocols', name: 'Reception', type: 'builtin', location: 'top' },
        { key: 'policies', name: 'Policies', type: 'builtin', location: 'top' },
        { key: 'operations', name: 'Operations', type: 'builtin', location: 'top' },
        { key: 'boarding', name: 'Boarding', type: 'builtin', location: 'sidebar' },
        { key: 'boarding-times', name: 'Boarding Times', type: 'builtin', location: 'sidebar' },
        { key: 'daily-ops', name: 'Tasks', type: 'builtin', location: 'sidebar' },
        { key: 'daily-banking', name: 'Daily Banking', type: 'builtin', location: 'sidebar' },
        { key: 'maintenance', name: 'Maintenance', type: 'builtin', location: 'sidebar' },
        { key: 'sms', name: 'SMS', type: 'builtin', location: 'sidebar' },
        { key: 'communications', name: 'Communications', type: 'builtin', location: 'sidebar' },
      ];

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
    const result = await pool.query(
      'UPDATE protocol_items SET title = $1, description = $2, sort_order = $3, default_sms_template_id = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [title, description, sort_order, default_sms_template_id || null, req.params.id]
    );
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
    const result = await pool.query(
      'INSERT INTO protocol_blocks (item_id, type, content) VALUES ($1, $2, $3) RETURNING *',
      [item_id, type, JSON.stringify(content)]
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
    const result = await pool.query('SELECT * FROM custom_tabs ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching custom tabs:', err);
    res.status(500).json({ error: 'Failed to fetch custom tabs' });
  }
});

app.post('/api/custom-tabs', authenticateToken, async (req, res) => {
  try {
    const { name, type, metadata } = req.body;
    const result = await pool.query(
      'INSERT INTO custom_tabs (name, type, metadata) VALUES ($1, $2, $3) RETURNING *',
      [name, type, metadata ? JSON.stringify(metadata) : null]
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
    const { name, type, metadata, location } = req.body;

    // Try to find by UUID first, then by key (for built-in tabs)
    let result = await pool.query(
      'UPDATE custom_tabs SET name = $1, type = $2, metadata = $3, location = $4, updated_at = CURRENT_TIMESTAMP WHERE id::text = $5 OR key = $5 RETURNING *',
      [name, type, metadata ? JSON.stringify(metadata) : null, location || 'top', id]
    );

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

        for (const blockData of itemData.blocks) {
          await pool.query(
            'INSERT INTO protocol_blocks (item_id, type, content) VALUES ($1, $2, $3)',
            [itemId, blockData.type, blockData.content]
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
});

module.exports = app;
