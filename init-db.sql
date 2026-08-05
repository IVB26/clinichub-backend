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

-- Boarding Times table
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

-- Daily Banking table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_policies_category ON policies(category);
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations_diaries(date);
CREATE INDEX IF NOT EXISTS idx_sms_user_id ON sms_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tab_cards_tab_id ON tab_cards(tab_id);
CREATE INDEX IF NOT EXISTS idx_banking_date ON banking_records(date);
CREATE INDEX IF NOT EXISTS idx_daily_banking_date ON daily_banking(entry_date);
CREATE INDEX IF NOT EXISTS idx_daily_banking_staff ON daily_banking(staff_name);
CREATE INDEX IF NOT EXISTS idx_boarding_times_date ON boarding_times(date);
