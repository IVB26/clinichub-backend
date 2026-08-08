const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const categories = [
  {
    name: 'Urgent',
    items: [
      {
        title: 'Emergency Triage',
        description: 'Immediate assessment protocol for emergency cases',
        blocks: [
          { type: 'heading', content: 'Assessment Priority' },
          { type: 'text', content: '1. Airway, breathing, circulation check\n2. Conscious state evaluation\n3. Pain assessment\n4. Hemorrhage control if needed\n5. Immediate stabilization measures' },
          { type: 'heading', content: 'Next Steps' },
          { type: 'text', content: '1. Veterinarian notification\n2. Treatment plan initiation\n3. Owner communication\n4. Monitoring and reassessment' }
        ]
      },
      {
        title: 'Critical Stabilization',
        description: 'Stabilization procedures for life-threatening conditions',
        blocks: [
          { type: 'heading', content: 'Immediate Interventions' },
          { type: 'text', content: '• Oxygen therapy if hypoxic\n• IV access establishment\n• Fluid administration\n• Pain management\n• Temperature regulation' },
          { type: 'heading', content: 'Monitoring' },
          { type: 'text', content: '• Heart rate and rhythm\n• Blood pressure\n• Oxygen saturation\n• Respiratory rate\n• Body temperature' }
        ]
      }
    ]
  },
  {
    name: 'Same Day',
    items: [
      {
        title: 'Same-Day Appointment Preparation',
        description: 'Quick assessment and treatment protocols',
        blocks: [
          { type: 'heading', content: 'Pre-Appointment' },
          { type: 'text', content: '1. Quick phone history taking\n2. Expected presentation time confirmation\n3. Preparation of examination room\n4. Equipment check' },
          { type: 'heading', content: 'Examination' },
          { type: 'text', content: '1. Vital signs\n2. Physical examination\n3. Diagnostic testing if needed\n4. Treatment initiation' }
        ]
      },
      {
        title: 'Minor Procedures',
        description: 'Quick same-day procedures',
        blocks: [
          { type: 'heading', content: 'Nail Trims' },
          { type: 'text', content: '1. Positioning and restraint\n2. Nail assessment\n3. Trim execution\n4. Styptic powder application if needed' },
          { type: 'heading', content: 'Ear Cleaning' },
          { type: 'text', content: '1. Otoscopic examination\n2. Cleaning solution application\n3. Debris removal\n4. Drying and assessment' }
        ]
      }
    ]
  },
  {
    name: 'Non-Urgent',
    items: [
      {
        title: 'Routine Health Checks',
        description: 'Non-urgent preventive health assessments',
        blocks: [
          { type: 'heading', content: 'Scheduled Appointment' },
          { type: 'text', content: '1. Book convenient time\n2. Pre-appointment questionnaire\n3. Current health status review\n4. Vaccination record check' },
          { type: 'heading', content: 'Examination Components' },
          { type: 'text', content: '1. Weight and body condition\n2. Dental assessment\n3. Coat and skin check\n4. General wellness evaluation' }
        ]
      },
      {
        title: 'Preventive Care',
        description: 'Vaccinations, parasite prevention, and wellness',
        blocks: [
          { type: 'heading', content: 'Vaccination Schedule' },
          { type: 'text', content: '• Review current vaccination status\n• Administer due vaccines\n• Schedule future boosters\n• Document administration' },
          { type: 'heading', content: 'Parasite Prevention' },
          { type: 'text', content: '• Flea and tick prevention\n• Internal parasite deworming\n• Heartworm testing\n• Prescription dispensing' }
        ]
      }
    ]
  },
  {
    name: 'Rehab',
    items: [
      {
        title: 'Post-Surgical Rehabilitation',
        description: 'Recovery protocols following surgery',
        blocks: [
          { type: 'heading', content: 'Phase 1: Immediate Recovery (Days 1-3)' },
          { type: 'text', content: '1. Pain management continuation\n2. Incision assessment\n3. Limited mobility enforcement\n4. Appetite monitoring' },
          { type: 'heading', content: 'Phase 2: Early Healing (Days 4-14)' },
          { type: 'text', content: '1. Gradual activity increase\n2. Physical therapy exercises\n3. Incision healing monitoring\n4. Suture removal scheduling' }
        ]
      },
      {
        title: 'Injury Recovery',
        description: 'Rehabilitation for injuries and soft tissue damage',
        blocks: [
          { type: 'heading', content: 'Assessment' },
          { type: 'text', content: '1. Injury severity evaluation\n2. Mobility assessment\n3. Pain level determination\n4. Treatment plan creation' },
          { type: 'heading', content: 'Treatment Protocol' },
          { type: 'text', content: '1. Physical therapy exercises\n2. Controlled activity progression\n3. Anti-inflammatory management\n4. Recovery milestone tracking' }
        ]
      },
      {
        title: 'Arthritis Management',
        description: 'Chronic condition rehabilitation and management',
        blocks: [
          { type: 'heading', content: 'Ongoing Care' },
          { type: 'text', content: '1. Anti-inflammatory medication\n2. Joint supplements\n3. Weight management\n4. Regular exercise programs' },
          { type: 'heading', content: 'Monitoring' },
          { type: 'text', content: '1. Monthly check-ins\n2. Mobility assessment\n3. Pain level evaluation\n4. Treatment adjustment as needed' }
        ]
      }
    ]
  }
];

async function addCategories() {
  try {
    console.log('Adding missing protocol categories...\n');

    for (const categoryData of categories) {
      // Check if category already exists
      const existingResult = await pool.query(
        'SELECT id FROM protocol_categories WHERE name = $1',
        [categoryData.name]
      );

      let categoryId;
      if (existingResult.rows.length > 0) {
        categoryId = existingResult.rows[0].id;
        console.log(`Category "${categoryData.name}" already exists (ID: ${categoryId})`);
      } else {
        const categoryResult = await pool.query(
          'INSERT INTO protocol_categories (name) VALUES ($1) RETURNING id',
          [categoryData.name]
        );
        categoryId = categoryResult.rows[0].id;
        console.log(`✓ Created category: ${categoryData.name}`);
      }

      // Add items
      for (const itemData of categoryData.items) {
        const itemResult = await pool.query(
          'INSERT INTO protocol_items (category_id, title, description) VALUES ($1, $2, $3) RETURNING id',
          [categoryId, itemData.title, itemData.description]
        );
        const itemId = itemResult.rows[0].id;
        console.log(`  ✓ Added: ${itemData.title}`);

        // Add blocks
        for (const blockData of itemData.blocks) {
          await pool.query(
            'INSERT INTO protocol_blocks (item_id, type, content) VALUES ($1, $2, $3)',
            [itemId, blockData.type, blockData.content]
          );
        }
      }
    }

    console.log('\n✓ All categories and items added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addCategories();
