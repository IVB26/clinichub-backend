# ClinicHub Backend

Express.js backend API for ClinicHub veterinary operations portal.

## Setup

### 1. Configure Database

**Get your Neon PostgreSQL connection string:**
1. Go to https://console.neon.tech
2. Create a new database called `clinichub`
3. Copy the connection string

**Update `.env` file:**
```
DATABASE_URL=postgresql://username:password@your-neon-host/clinichub
JWT_SECRET=generate-a-random-secret-key-here
PORT=5000
```

### 2. Initialize Database

Run the SQL schema in Neon:
1. Go to Neon console
2. Open SQL Editor
3. Paste contents of `init-db.sql`
4. Execute

**OR from command line:**
```bash
psql "$DATABASE_URL" < init-db.sql
```

### 3. Seed Initial Data

Create a seed script to add default users:

```bash
cat > seed.js << 'EOF'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const users = [
    { username: 'admin', password: 'admin', name: 'Dr. Sarah Mitchell', role: 'admin' },
    { username: 'jessica', password: '1234', name: 'Jessica Park', role: 'staff' },
    { username: 'tom', password: '1234', name: 'Tom Reynolds', role: 'staff' },
    { username: 'amy', password: '1234', name: 'Amy Chen', role: 'staff' },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [user.username, hash, user.name, user.role]
    );
  }

  console.log('Database seeded!');
  pool.end();
}

seed().catch(console.error);
EOF
```

Run the seed:
```bash
node seed.js
```

### 4. Start Backend

```bash
npm start
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication

**POST `/api/auth/login`**
```json
{
  "username": "admin",
  "password": "admin"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Dr. Sarah Mitchell",
    "role": "admin"
  }
}
```

**POST `/api/auth/verify`** (requires token)
Verifies JWT token validity

### Policies

**GET `/api/policies`** — Get all policies
**POST `/api/policies`** — Create policy (admin/manager only)

### SMS

**POST `/api/sms/send`** — Send SMS message
```json
{
  "toNumber": "+61412345678",
  "body": "Your message here"
}
```

### Health

**GET `/health`** — API status check

## Headers

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Environment Variables

```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+61...
NODE_ENV=development
```

## Next Steps

1. Test endpoints with Postman/Insomnia
2. Update frontend (clinichub.html) to call these APIs
3. Deploy to Vercel/Render/Railway
4. Add Twilio integration
5. Add proper error logging

## Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Render
1. Push to GitHub
2. Connect repo to Render
3. Set environment variables
4. Deploy

### Railway
1. Push to GitHub
2. Connect repo to Railway
3. Add Neon database
4. Deploy

## Troubleshooting

- **Connection refused**: Check DATABASE_URL and Neon firewall rules
- **JWT errors**: Verify JWT_SECRET matches between requests
- **CORS errors**: Update CORS origin in server.js for your frontend URL
