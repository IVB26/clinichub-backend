const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function exportAllProtocolData() {
  try {
    console.log('📦 Starting protocol data export...\n');

    // Export categories
    const categoriesResult = await pool.query('SELECT * FROM protocol_categories ORDER BY id');
    const categories = categoriesResult.rows;
    console.log(`✓ Exported ${categories.length} categories`);

    // Export items
    const itemsResult = await pool.query('SELECT * FROM protocol_items ORDER BY id');
    const items = itemsResult.rows;
    console.log(`✓ Exported ${items.length} items`);

    // Export blocks
    const blocksResult = await pool.query('SELECT * FROM protocol_blocks ORDER BY id');
    const blocks = blocksResult.rows;
    console.log(`✓ Exported ${blocks.length} blocks`);

    // Export forms
    const formsResult = await pool.query('SELECT * FROM protocol_forms ORDER BY id');
    const forms = formsResult.rows;
    console.log(`✓ Exported ${forms.length} forms`);

    // Export SMS templates
    const smsResult = await pool.query('SELECT * FROM protocol_sms_templates ORDER BY id');
    const smsTemplates = smsResult.rows;
    console.log(`✓ Exported ${smsTemplates.length} SMS templates`);

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        categories,
        items,
        blocks,
        forms,
        smsTemplates
      },
      metadata: {
        totalItems: items.length,
        totalBlocks: blocks.length,
        totalForms: forms.length,
        exportedAt: new Date().toLocaleString()
      }
    };

    // Save to timestamped file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `protocol-backup-${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    console.log(`\n✅ Backup saved: ${filename}`);
    console.log(`📍 Location: ${filepath}`);

    // Also maintain a "latest" backup for quick restore
    const latestPath = path.join(BACKUP_DIR, 'protocol-backup-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(backup, null, 2));
    console.log(`✅ Latest backup updated`);

    // List all backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('protocol-backup-') && f.endsWith('.json') && !f.includes('latest'))
      .sort()
      .reverse();

    console.log(`\n📚 Backup History (keeping last 7):`);
    backups.forEach((backup, index) => {
      if (index < 7) {
        console.log(`  ✓ ${backup}`);
      } else if (index === 7) {
        console.log(`  ... and ${backups.length - 7} older backups`);
      }
    });

    // Delete backups older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    backups.slice(7).forEach(backup => {
      const filepath = path.join(BACKUP_DIR, backup);
      const stats = fs.statSync(filepath);
      if (stats.mtime < sevenDaysAgo) {
        fs.unlinkSync(filepath);
        console.log(`  🗑️  Deleted old backup: ${backup}`);
      }
    });

    console.log('\n✅ Export complete!\n');
    return { success: true, filename, backup };

  } catch (err) {
    console.error('❌ Export failed:', err.message);
    throw err;
  }
}

async function restoreFromBackup(backupFilename = null) {
  try {
    // Use provided filename or latest backup
    const filepath = backupFilename
      ? path.join(BACKUP_DIR, backupFilename)
      : path.join(BACKUP_DIR, 'protocol-backup-latest.json');

    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filepath}`);
    }

    console.log(`\n🔄 Restoring from: ${path.basename(filepath)}\n`);

    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    console.log(`📅 Backup timestamp: ${backupData.timestamp}`);
    console.log(`📊 Contains: ${backupData.metadata.totalItems} items, ${backupData.metadata.totalBlocks} blocks, ${backupData.metadata.totalForms} forms\n`);

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      console.log('🔒 Transaction started...\n');

      // Clear existing data (in reverse dependency order)
      await client.query('DELETE FROM protocol_forms');
      await client.query('DELETE FROM protocol_sms_templates');
      await client.query('DELETE FROM protocol_blocks');
      await client.query('DELETE FROM protocol_items');
      // Don't delete categories - they might be referenced elsewhere

      console.log('✓ Cleared existing protocol data');

      // Restore categories
      for (const cat of backupData.data.categories) {
        await client.query(
          'INSERT INTO protocol_categories (id, name, color, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [cat.id, cat.name, cat.color || '#3B82F6', cat.sort_order || 0, cat.created_at, cat.updated_at]
        );
      }
      console.log(`✓ Restored ${backupData.data.categories.length} categories`);

      // Restore items
      for (const item of backupData.data.items) {
        await client.query(
          'INSERT INTO protocol_items (id, category_id, title, description, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.id, item.category_id, item.title, item.description, item.sort_order || 0, item.created_at, item.updated_at]
        );
      }
      console.log(`✓ Restored ${backupData.data.items.length} items`);

      // Restore blocks
      for (const block of backupData.data.blocks) {
        const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
        await client.query(
          'INSERT INTO protocol_blocks (id, item_id, type, content, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [block.id, block.item_id, block.type, content, block.sort_order || 0, block.created_at, block.updated_at]
        );
      }
      console.log(`✓ Restored ${backupData.data.blocks.length} blocks`);

      // Restore forms
      for (const form of backupData.data.forms) {
        const questions = typeof form.questions === 'string' ? form.questions : JSON.stringify(form.questions);
        await client.query(
          'INSERT INTO protocol_forms (id, item_id, title, questions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [form.id, form.item_id, form.title, questions, form.created_at, form.updated_at]
        );
      }
      console.log(`✓ Restored ${backupData.data.forms.length} forms`);

      // Restore SMS templates
      for (const sms of backupData.data.smsTemplates) {
        await client.query(
          'INSERT INTO protocol_sms_templates (id, item_id, template_name, template_content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [sms.id, sms.item_id, sms.template_name, sms.template_content, sms.created_at, sms.updated_at]
        );
      }
      console.log(`✓ Restored ${backupData.data.smsTemplates.length} SMS templates`);

      await client.query('COMMIT');
      console.log('\n✅ Transaction committed - restore complete!\n');

      return { success: true, restored: backupData.metadata };

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Restore failed, rolling back...');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('❌ Restore error:', err.message);
    throw err;
  }
}

async function listBackups() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('protocol-backup-') && f.endsWith('.json') && !f.includes('latest'))
      .sort()
      .reverse();

    console.log('\n📚 Available Backups:\n');
    backups.forEach((backup, index) => {
      const filepath = path.join(BACKUP_DIR, backup);
      const stats = fs.statSync(filepath);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      console.log(`${index + 1}. ${backup}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Date: ${data.timestamp}`);
      console.log(`   Items: ${data.metadata.totalItems}, Blocks: ${data.metadata.totalBlocks}, Forms: ${data.metadata.totalForms}`);
      console.log('');
    });

    return { success: true, backupCount: backups.length, backups };

  } catch (err) {
    console.error('❌ List failed:', err.message);
    throw err;
  }
}

async function verifyBackup(backupFilename = null) {
  try {
    const filepath = backupFilename
      ? path.join(BACKUP_DIR, backupFilename)
      : path.join(BACKUP_DIR, 'protocol-backup-latest.json');

    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filepath}`);
    }

    console.log(`\n🔍 Verifying: ${path.basename(filepath)}\n`);

    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    // Verify structure
    const checks = [
      { name: 'Has timestamp', check: !!data.timestamp },
      { name: 'Has version', check: !!data.version },
      { name: 'Has categories', check: Array.isArray(data.data.categories) && data.data.categories.length > 0 },
      { name: 'Has items', check: Array.isArray(data.data.items) && data.data.items.length > 0 },
      { name: 'Has blocks', check: Array.isArray(data.data.blocks) && data.data.blocks.length > 0 },
      { name: 'Has metadata', check: !!data.metadata }
    ];

    checks.forEach(c => {
      console.log(`${c.check ? '✓' : '✗'} ${c.name}`);
    });

    const allPassed = checks.every(c => c.check);
    console.log(`\n${allPassed ? '✅ Backup is valid' : '❌ Backup failed verification'}\n`);

    return { success: allPassed, verified: data.metadata };

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    throw err;
  }
}

// CLI commands
const command = process.argv[2];

switch (command) {
  case 'export':
    exportAllProtocolData().then(() => process.exit(0)).catch(err => {
      console.error(err);
      process.exit(1);
    });
    break;

  case 'restore':
    const backupFile = process.argv[3];
    restoreFromBackup(backupFile).then(() => process.exit(0)).catch(err => {
      console.error(err);
      process.exit(1);
    });
    break;

  case 'list':
    listBackups().then(() => process.exit(0)).catch(err => {
      console.error(err);
      process.exit(1);
    });
    break;

  case 'verify':
    const verifyFile = process.argv[3];
    verifyBackup(verifyFile).then(() => process.exit(0)).catch(err => {
      console.error(err);
      process.exit(1);
    });
    break;

  default:
    console.log(`
ClinicHub Protocol Backup & Restore Tool

Usage:
  node backup-protocols.js export                    # Export all protocol data to backup file
  node backup-protocols.js restore [filename]        # Restore from backup (uses latest if no file specified)
  node backup-protocols.js list                      # List all available backups
  node backup-protocols.js verify [filename]         # Verify a backup file is valid

Examples:
  node backup-protocols.js export
  node backup-protocols.js restore protocol-backup-2026-08-09.json
  node backup-protocols.js list
  node backup-protocols.js verify
    `);
    process.exit(0);
}
