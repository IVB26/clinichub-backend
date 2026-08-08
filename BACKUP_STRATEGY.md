# ClinicHub Backup & Restore Strategy

## Overview

A **3-layer backup system** protects your protocol data and prevents data loss like what happened on August 8, 2026.

---

## Layer 1: Automatic Railway Backups ✅

**Provider**: Railway (PostgreSQL)  
**Frequency**: Daily automatic backups  
**Retention**: 7-30 days (depends on Railway plan)  
**Access**: Railway dashboard → Database → Backups

**How to use if needed:**
1. Go to Railway dashboard
2. Navigate to your PostgreSQL database
3. Click "Backups" tab
4. Select restore point and initiate restore
5. Database will be restored to that point in time

**Cost**: Included in Railway PostgreSQL pricing

---

## Layer 2: Git-Based JSON Exports

**What it does**: Exports all protocol data to JSON files, committed to git daily  
**Frequency**: Automatically 2 AM UTC daily  
**Retention**: Last 7 days of backups  
**Location**: `clinichub-backend/backups/` directory

**Files created:**
```
backups/
├── protocol-backup-2026-08-08.json    # Daily backup
├── protocol-backup-2026-08-09.json
├── protocol-backup-latest.json        # Always points to newest
└── backup-schedule.log                # Backup execution log
```

**Benefits:**
- Version control via git (see what changed when)
- Easy to review via git history
- Portable (can restore on any machine with Node.js)
- Human-readable JSON format

---

## Layer 3: One-Click Restore Scripts

**Tool**: `backup-protocols.js`  
**Location**: `/clinichub-backend/backup-protocols.js`

### Usage Commands

#### **Export (Create Backup)**
```bash
cd clinichub-backend
node backup-protocols.js export
```
Creates a timestamped backup file with all protocol data.

#### **List Available Backups**
```bash
node backup-protocols.js list
```
Shows all available backup files with metadata:
- Backup filename
- Creation timestamp
- File size
- Number of items, blocks, forms

#### **Verify Backup is Valid**
```bash
node backup-protocols.js verify [filename]
```
Validates that a backup file has correct structure:
- Contains all required tables
- Metadata is intact
- No corruption detected

```bash
# Verify latest backup
node backup-protocols.js verify

# Verify specific backup
node backup-protocols.js verify protocol-backup-2026-08-09.json
```

#### **Restore from Backup**
```bash
node backup-protocols.js restore [filename]
```
Restores database from a backup file. **This will replace current protocol data.**

```bash
# Restore from latest backup
node backup-protocols.js restore

# Restore from specific date
node backup-protocols.js restore protocol-backup-2026-08-09.json
```

**Restore process:**
1. Starts database transaction
2. Clears current protocol data (safe rollback if fails)
3. Restores categories, items, blocks, forms
4. Commits transaction
5. Verifies restore succeeded

---

## Layer 4: Admin API Endpoints

Backup operations available through REST API (admin only):

### **POST /api/admin/backup/export**
Manually trigger a backup export.

**Request:**
```bash
curl -X POST https://clinichub-backend-production-35fe.up.railway.app/api/admin/backup/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Backup export completed successfully",
  "output": "✓ Exported 6 categories..."
}
```

### **GET /api/admin/backup/list**
List all available backups with metadata.

**Response:**
```json
{
  "success": true,
  "backups": [
    {
      "filename": "protocol-backup-2026-08-09.json",
      "timestamp": "2026-08-09T02:00:00.000Z",
      "size": 45238,
      "items": 39,
      "blocks": 543,
      "forms": 12
    }
  ]
}
```

### **POST /api/admin/backup/restore**
Restore from a specific backup.

**Request:**
```bash
curl -X POST https://clinichub-backend-production-35fe.up.railway.app/api/admin/backup/restore \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backupFilename": "protocol-backup-2026-08-09.json"}'
```

### **POST /api/admin/backup/verify**
Verify a backup file is valid.

**Request:**
```bash
curl -X POST https://clinichub-backend-production-35fe.up.railway.app/api/admin/backup/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backupFilename": "protocol-backup-2026-08-09.json"}'
```

---

## Automatic Backup Schedule

**Current Schedule**: 2 AM UTC daily

To change the schedule, edit `backup-scheduler.js`:
```javascript
const BACKUP_SCHEDULE = '0 2 * * *'; // Change this
// Format: minute hour day month dayOfWeek
// '0 2 * * *' = 2 AM every day
// '0 */6 * * *' = Every 6 hours
```

Then restart the server for changes to take effect.

---

## Disaster Recovery Checklist

If you lose data or need to restore:

### **Step 1: Identify Latest Good Backup**
```bash
node backup-protocols.js list
```
Find the most recent backup before the data loss occurred.

### **Step 2: Verify Backup Integrity**
```bash
node backup-protocols.js verify protocol-backup-2026-08-09.json
```
Confirm backup is valid before restore.

### **Step 3: Perform Restore**
```bash
node backup-protocols.js restore protocol-backup-2026-08-09.json
```
This will restore all protocol data to that point in time.

### **Step 4: Verify Restoration**
- Log into the app
- Check that all protocol items, forms, and blocks are present
- Verify data looks correct

### **Step 5: Commit to Git** (Optional)
If this was an emergency restore, commit it:
```bash
git add backups/
git commit -m "Emergency restore from backup: protocol-backup-2026-08-09.json"
git push origin main
```

---

## Backup Retention Policy

- **Automatic backups**: Kept for 7 days (older ones deleted)
- **Manual backups**: Not auto-deleted (you must manage)
- **Git history**: Permanent (all backups committed to git)

To keep a backup longer than 7 days, commit it to git:
```bash
git add backups/protocol-backup-2026-08-09.json
git commit -m "Archive important backup from before major changes"
```

---

## Testing Your Backup

**Recommended**: Test your backup restoration monthly

```bash
# 1. List backups
node backup-protocols.js list

# 2. Verify latest backup
node backup-protocols.js verify

# 3. On a test database (if possible), restore and verify
# DO NOT do this on production without caution!
node backup-protocols.js restore protocol-backup-latest.json
```

---

## Monitoring Backup Status

Check the backup log file:
```bash
tail -f clinichub-backend/backups/backup-schedule.log
```

This shows:
- When backups ran
- Whether they succeeded or failed
- Any errors encountered

---

## What's Backed Up

Each backup includes:
- ✅ Protocol categories
- ✅ Protocol items (titles, descriptions)
- ✅ Protocol blocks (content, formatting)
- ✅ Protocol forms (questions, field types)
- ✅ SMS templates
- ✅ Metadata (timestamps, version info)

**Not backed up** (stored elsewhere or user-managed):
- User accounts (managed by Railway)
- Custom tabs
- Form submissions
- Communications
- Operations data

---

## Troubleshooting

### Backup fails silently
Check the log:
```bash
tail clinichub-backend/backups/backup-schedule.log
```

### Can't restore due to database locked
Wait 1-2 minutes for any active connections to close, then retry.

### Backup file corrupted
Check file size is reasonable (> 10KB), verify with:
```bash
node backup-protocols.js verify protocol-backup-YYYY-MM-DD.json
```

If corrupted, restore from an older backup.

---

## Long-Term Recommendations

1. **Keep 3+ months of backups** for historical reference
2. **Monthly verification** of backup integrity
3. **Test restore annually** on a test database
4. **Document your backup schedule** (post in team chat)
5. **Alert team to backup events** (optional: send Slack notification on backup)

---

## Next Steps for You

1. ✅ Backup system is now installed and running
2. ✅ Automatic backups start at 2 AM UTC daily  
3. 📝 **Re-enter your protocol forms** using the Admin UI
4. 🧪 **Test a backup/restore** once you have data to protect
5. 📋 **Document your backup schedule** for your team

---

**Last Updated**: August 8, 2026  
**Version**: 1.0
