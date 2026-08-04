const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    const users = [
      { username: 'admin', password: 'admin', name: 'Dr. Sarah Mitchell', role: 'admin' },
      { username: 'jessica', password: '1234', name: 'Jessica Park', role: 'staff' },
      { username: 'tom', password: '1234', name: 'Tom Reynolds', role: 'staff' },
      { username: 'amy', password: '1234', name: 'Amy Chen', role: 'staff' },
    ];

    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);
      await pool.query(
        'INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING',
        [user.username, hash, user.name, user.role]
      );
      console.log(`Created user: ${user.username}`);
    }

    console.log('Database seeded!');
    pool.end();
  } catch (err) {
    console.error('Seed error:', err);
    pool.end();
  }
}

seed();
