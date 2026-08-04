-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'staff',
  access JSONB DEFAULT '[]',
  color VARCHAR(7),
  initials VARCHAR(5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  overview TEXT,
  content JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Boarding table
CREATE TABLE IF NOT EXISTS boarding (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  steps JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Operations Diaries table
CREATE TABLE IF NOT EXISTS operations_diaries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  tasks JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS History table
CREATE TABLE IF NOT EXISTS sms_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  to_number VARCHAR(20),
  body TEXT,
  status VARCHAR(20),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom Tabs table
CREATE TABLE IF NOT EXISTS custom_tabs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  access JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tab Cards table (for card-type tabs)
CREATE TABLE IF NOT EXISTS tab_cards (
  id SERIAL PRIMARY KEY,
  tab_id INTEGER REFERENCES custom_tabs(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tab Form Questions table
CREATE TABLE IF NOT EXISTS tab_form_questions (
  id SERIAL PRIMARY KEY,
  tab_id INTEGER REFERENCES custom_tabs(id) ON DELETE CASCADE,
  question TEXT,
  type VARCHAR(50),
  options JSONB,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tab Form Submissions table
CREATE TABLE IF NOT EXISTS tab_form_submissions (
  id SERIAL PRIMARY KEY,
  tab_id INTEGER REFERENCES custom_tabs(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  responses JSONB,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Inbox table
CREATE TABLE IF NOT EXISTS admin_inbox (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  form_submission_id INTEGER REFERENCES tab_form_submissions(id),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Banking Records table
CREATE TABLE IF NOT EXISTS banking_records (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10, 2),
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Questions table
CREATE TABLE IF NOT EXISTS maintenance_questions (
  id SERIAL PRIMARY KEY,
  clinic_id VARCHAR(50),
  question TEXT,
  type VARCHAR(50),
  options JSONB,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Submissions table
CREATE TABLE IF NOT EXISTS maintenance_submissions (
  id SERIAL PRIMARY KEY,
  clinic_id VARCHAR(50),
  user_id INTEGER REFERENCES users(id),
  responses JSONB,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_policies_category ON policies(category);
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations_diaries(date);
CREATE INDEX IF NOT EXISTS idx_sms_user_id ON sms_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tab_cards_tab_id ON tab_cards(tab_id);
CREATE INDEX IF NOT EXISTS idx_banking_date ON banking_records(date);
