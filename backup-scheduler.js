const cron = require('node-cron');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run backup export daily at 2 AM (UTC)
// Adjust time as needed: '0 2 * * *' = 2 AM every day

const BACKUP_SCHEDULE = '0 2 * * *'; // 2 AM UTC daily
const LOG_FILE = path.join(__dirname, 'backups', 'backup-schedule.log');

function logBackupEvent(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // Log to console
  console.log(logMessage.trim());

  // Log to file
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (err) {
    console.error('Could not write to backup log:', err.message);
  }
}

function scheduleBackups() {
  console.log('🕐 Backup scheduler started');
  console.log(`📅 Schedule: ${BACKUP_SCHEDULE} (2 AM UTC daily)`);

  // Schedule recurring backups (don't run on startup to save bandwidth)
  cron.schedule(BACKUP_SCHEDULE, () => {
    logBackupEvent('Scheduled backup triggered');
    runBackup();
  });

  console.log('✅ Backup scheduler ready (runs daily at 2 AM UTC)\n');
}

function runBackup() {
  try {
    logBackupEvent('Starting backup export...');

    // Run the backup export
    execSync('node backup-protocols.js export', {
      cwd: __dirname,
      stdio: 'pipe'
    });

    logBackupEvent('✅ Backup export successful');

    // Verify the backup
    execSync('node backup-protocols.js verify', {
      cwd: __dirname,
      stdio: 'pipe'
    });

    logBackupEvent('✅ Backup verification passed');

  } catch (err) {
    logBackupEvent(`❌ Backup failed: ${err.message}`);
    // Don't crash the server, just log the error
    console.error('Backup error:', err.message);
  }
}

module.exports = { scheduleBackups, logBackupEvent };
