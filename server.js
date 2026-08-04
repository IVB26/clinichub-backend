const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://luminous-cupcake-4652c1.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ─────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────

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
      process.env.JWT_SECRET,
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
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ─────────────────────────────────────────
// POLICIES ENDPOINTS
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// SMS ENDPOINTS
// ─────────────────────────────────────────

app.post('/api/sms/send', authenticateToken, async (req, res) => {
  try {
    const { toNumber, body } = req.body;

    if (!toNumber || !body) {
      return res.status(400).json({ error: 'Phone number and message required' });
    }

    const isValidPhone = /^[\d\s\-\+\(\)]{8,}$/.test(toNumber.trim())
      && toNumber.replace(/\D/g, "").length >= 8;

    if (!isValidPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    await pool.query(
      'INSERT INTO sms_history (user_id, to_number, body, status) VALUES ($1, $2, $3, $4)',
      [req.user.id, toNumber, body, 'sent']
    );

    res.json({ success: true, message: 'SMS sent' });
  } catch (err) {
    console.error('SMS error:', err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`ClinicHub backend running on http://localhost:${port}`);
});

module.exports = app;
