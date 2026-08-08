const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Original protocol data extracted from git history
const originalProtocols = [
  {
    name: 'Urgent',
    items: [
      {
        title: 'Emergency & After-Hours Protocol',
        description: 'Procedures for managing emergency presentations, after-hours calls, and escalation of critically ill patients to specialist or referral centres.',
        blocks: [
          { type: 'heading', content: 'Triage Categories' },
          { type: 'text', content: 'Red (Immediate): Life-threatening — respiratory distress, severe trauma, collapse, suspected toxin ingestion, uncontrolled bleeding.\nOrange (Urgent): Significant concern — severe pain, urinary obstruction, birthing complications, seizures.\nGreen (Standard): Stable — can be seen at next available appointment.' },
          { type: 'heading', content: 'Emergency Response Steps' },
          { type: 'text', content: '1. Notify a veterinarian immediately of any Red or Orange triage category patient.\n2. Take patient directly to treatment area — do not make owner wait in reception.\n3. Begin initial assessment: airway, breathing, circulation (ABC check).\n4. Establish IV access if directed by the vet.\n5. Assign one staff member to communicate with the owner throughout.\n6. Document all steps in real time.' },
          { type: 'heading', content: 'After-Hours Calls' },
          { type: 'text', content: 'After-hours calls are directed to the designated after-hours emergency service.\nStaff are not obligated to provide medical advice after hours — direct all callers to the emergency line.' },
          { type: 'heading', content: 'Escalation & Transfer' },
          { type: 'text', content: 'If a patient requires care beyond the practice\'s capacity, arrange transfer to the nearest emergency referral centre.\nContact the referral centre before transporting and provide a clinical summary.\nComplete a patient transfer form and ensure records are sent electronically.' }
        ]
      }
    ]
  },
  {
    name: 'Same Day',
    items: [
      {
        title: 'Same-Day Appointment Preparation',
        description: 'Quick assessment and treatment protocols for same-day appointments',
        blocks: [
          { type: 'heading', content: 'Pre-Appointment' },
          { type: 'text', content: '1. Quick phone history taking\n2. Expected presentation time confirmation\n3. Preparation of examination room\n4. Equipment check' },
          { type: 'heading', content: 'Examination' },
          { type: 'text', content: '1. Vital signs\n2. Physical examination\n3. Diagnostic testing if needed\n4. Treatment initiation' }
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
  },
  {
    name: 'General Surgery',
    items: [
      {
        title: 'Spay/Neuter Protocol',
        description: 'Standard spay and neuter surgical procedure guidelines',
        blocks: [
          { type: 'heading', content: 'Pre-Operative Preparation' },
          { type: 'text', content: '1. Pre-surgical bloodwork required for all animals over 7 years\n2. NPO (nothing by mouth) 8-12 hours before surgery\n3. IV catheter placement\n4. Administer pre-anesthetic medications' },
          { type: 'heading', content: 'Post-Operative Care' },
          { type: 'text', content: '1. Pain management for 3-5 days\n2. E-collar to prevent incision licking\n3. Restricted activity for 10-14 days\n4. Suture removal in 10-14 days' }
        ]
      },
      {
        title: 'Dental Extraction',
        description: 'Guidelines for dental extractions and oral surgery',
        blocks: [
          { type: 'heading', content: 'Pre-Extraction Assessment' },
          { type: 'text', content: '1. Full mouth radiographs required\n2. Assess tooth vitality and root structure\n3. Evaluate bone density' },
          { type: 'heading', content: 'Post-Extraction Instructions' },
          { type: 'text', content: '1. Soft diet for 2 weeks\n2. Pain management as prescribed\n3. Monitor extraction site daily' }
        ]
      },
      {
        title: 'Laceration Repair',
        description: 'Wound closure and suturing procedures',
        blocks: [
          { type: 'heading', content: 'Wound Assessment' },
          { type: 'text', content: '1. Clip and clean area\n2. Assess wound depth\n3. Determine closure method' },
          { type: 'heading', content: 'Repair Procedure' },
          { type: 'text', content: '1. Local anesthesia if appropriate\n2. Layer closure if deep\n3. Skin closure with sutures or staples' }
        ]
      }
    ]
  },
  {
    name: 'Miscellaneous',
    items: [
      {
        title: 'General Clinic Procedures',
        description: 'Common miscellaneous procedures and treatments',
        blocks: [
          { type: 'heading', content: 'Script Requests & Prescription Refills' },
          { type: 'text', content: 'Process prescription refill requests from clients and veterinarians.' },
          { type: 'heading', content: 'Microchipping' },
          { type: 'text', content: 'Microchip insertion and registration procedures.' },
          { type: 'heading', content: 'Health Certificates & Travel Documents' },
          { type: 'text', content: 'Issue health certificates for travel and veterinary documentation.' }
        ]
      }
    ]
  }
];

async function restoreProtocols() {
  try {
    console.log('Restoring original protocol data...\n');

    for (const categoryData of originalProtocols) {
      // Check if category exists
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

    console.log('\n✓ All original protocols restored successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restoreProtocols();
