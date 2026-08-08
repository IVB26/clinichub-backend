const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const protocolData = [
  {
    category: 'Surgery Protocols',
    items: [
      {
        title: 'Spay/Neuter Protocol',
        description: 'Standard spay and neuter surgical procedure guidelines',
        blocks: [
          { type: 'heading', content: 'Pre-Operative Preparation' },
          { type: 'text', content: '1. Pre-surgical bloodwork required for all animals over 7 years\n2. NPO (nothing by mouth) 8-12 hours before surgery\n3. IV catheter placement\n4. Administer pre-anesthetic medications as per anesthesia protocol' },
          { type: 'heading', content: 'Surgical Procedure' },
          { type: 'text', content: '1. Surgical site preparation and sterile draping\n2. Standard midline or flank incision\n3. Identify and ligate blood vessels\n4. Remove ovaries/uterus (females) or testicles (males)\n5. Layer closure: peritoneum, muscle, skin' },
          { type: 'heading', content: 'Post-Operative Care' },
          { type: 'text', content: '1. Recovery monitoring in warm, quiet area\n2. Pain management for 3-5 days\n3. E-collar to prevent incision licking\n4. Restricted activity for 10-14 days\n5. Suture removal in 10-14 days' }
        ]
      },
      {
        title: 'Dental Extraction Protocol',
        description: 'Guidelines for dental extractions and oral surgery',
        blocks: [
          { type: 'heading', content: 'Pre-Extraction Assessment' },
          { type: 'text', content: '1. Full mouth radiographs required\n2. Assess tooth vitality and root structure\n3. Determine extraction technique needed\n4. Evaluate bone density and tooth attachment' },
          { type: 'heading', content: 'Extraction Technique' },
          { type: 'text', content: '1. Local anesthesia with line blocks\n2. Elevation and luxation of tooth\n3. Sectioning if necessary for multi-rooted teeth\n4. Remove tooth and alveolar bone smoothing\n5. Closure with absorbable sutures' },
          { type: 'heading', content: 'Post-Extraction Instructions' },
          { type: 'text', content: '1. Soft diet for 2 weeks\n2. Pain management as prescribed\n3. No chewing on hard objects\n4. Monitor extraction site daily\n5. Return for suture removal if non-absorbable used' }
        ]
      }
    ]
  },
  {
    category: 'Vaccination Guidelines',
    items: [
      {
        title: 'Puppy Vaccination Schedule',
        description: 'Core and non-core vaccination protocols for puppies',
        blocks: [
          { type: 'heading', content: 'Age 6-8 Weeks' },
          { type: 'text', content: '• DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)\n• Bordetella (intranasal)\n• Fecal exam and deworming' },
          { type: 'heading', content: 'Age 10-12 Weeks' },
          { type: 'text', content: '• DHPP booster\n• Bordetella booster\n• Leptospirosis (if recommended)\n• Fecal exam and deworming' },
          { type: 'heading', content: 'Age 14-16 Weeks' },
          { type: 'text', content: '• DHPP booster\n• Rabies vaccination\n• Lyme (if in endemic area)\n• Final deworming' },
          { type: 'heading', content: 'Age 1 Year' },
          { type: 'text', content: '• DHPP booster\n• Rabies booster\n• Fecal exam' }
        ]
      },
      {
        title: 'Adult Vaccination Schedule',
        description: 'Annual and triennial vaccination protocols for adult dogs',
        blocks: [
          { type: 'heading', content: 'Annual Vaccines' },
          { type: 'text', content: '• DHPP\n• Rabies (3-year vaccine available)\n• Bordetella (if lifestyle indicates)\n• Influenza (if exposure risk)' },
          { type: 'heading', content: 'Triennial Vaccines' },
          { type: 'text', content: '• Rabies (3-year formula)\n• DHPP (per AAHA guidelines)' },
          { type: 'heading', content: 'As Needed' },
          { type: 'text', content: '• Leptospirosis (annual for high-risk areas)\n• Lyme (annual for endemic areas)\n• Giardia (for specific cases)' }
        ]
      }
    ]
  },
  {
    category: 'Anesthesia Protocols',
    items: [
      {
        title: 'Routine Anesthesia Protocol',
        description: 'Standard anesthesia protocol for routine surgical procedures',
        blocks: [
          { type: 'heading', content: 'Pre-Anesthetic Medications (30 min before)' },
          { type: 'text', content: '• Dexmedetomidine: 5-10 mcg/kg IM\n• Hydromorphone: 0.1 mg/kg IM\n• Combination provides sedation and analgesia' },
          { type: 'heading', content: 'Induction' },
          { type: 'text', content: '• Propofol: 4-6 mg/kg IV slow\n• OR Alfaxalone: 5 mg/kg IV\n• Administer to effect' },
          { type: 'heading', content: 'Intubation & Maintenance' },
          { type: 'text', content: '• Endotracheal tube appropriate size\n• Isoflurane or sevoflurane gas anesthesia\n• Oxygen supplementation\n• Monitor heart rate, SPO2, BP, temperature' },
          { type: 'heading', content: 'Recovery' },
          { type: 'text', content: '• Allow full recovery in quiet area\n• Warm environment to prevent hypothermia\n• Monitor vitals until alert and standing' }
        ]
      },
      {
        title: 'Pain Management Post-Surgery',
        description: 'Post-operative analgesia protocols',
        blocks: [
          { type: 'heading', content: 'Immediate Post-Op (first 24 hrs)' },
          { type: 'text', content: '• Hydromorphone: 0.1-0.15 mg/kg IM/IV Q4-6H\n• OR Morphine: 0.5-1 mg/kg IM Q4-6H' },
          { type: 'heading', content: 'Days 2-5' },
          { type: 'text', content: '• Carprofen: 2-4 mg/kg BID (or similar NSAID)\n• Tramadol: 5-10 mg/kg TID if needed\n• Gabapentin: 10-15 mg/kg TID for neuropathic pain' },
          { type: 'heading', content: 'Home Care Instructions' },
          { type: 'text', content: '1. Give pain medication as prescribed\n2. Monitor incision for swelling/discharge\n3. Restrict activity for full recovery\n4. Return for check-up if pain increases' }
        ]
      }
    ]
  },
  {
    category: 'Emergency Procedures',
    items: [
      {
        title: 'Cardiac Arrest Protocol',
        description: 'CPR and resuscitation procedures',
        blocks: [
          { type: 'heading', content: 'Recognition' },
          { type: 'text', content: '• No heartbeat on auscultation\n• No pulse palpable\n• Loss of consciousness\n• Dilated pupils (may not be reliable)' },
          { type: 'heading', content: 'Immediate Actions' },
          { type: 'text', content: '1. Begin chest compressions: 100-120/min\n2. Establish airway - intubate if possible\n3. Provide positive pressure ventilation\n4. IV access if not already established' },
          { type: 'heading', content: 'Medications (per ACLS guidelines)' },
          { type: 'text', content: '• Epinephrine: 0.01-0.1 mg/kg IV Q3-5min\n• Atropine: 0.02 mg/kg IV Q3-5min\n• Dextrose: 0.5-1 g/kg IV if hypoglycemic\n• Sodium bicarbonate: 0.5-1 mEq/kg IV' },
          { type: 'heading', content: 'Continue until' },
          { type: 'text', content: '• Return of spontaneous circulation\n• No response after 20 minutes\n• Team decides to stop resuscitation' }
        ]
      },
      {
        title: 'Severe Hemorrhage Protocol',
        description: 'Management of life-threatening bleeding',
        blocks: [
          { type: 'heading', content: 'Immediate Management' },
          { type: 'text', content: '1. Apply direct pressure to bleeding site\n2. Place in shock position (hindquarters elevated)\n3. Keep animal warm and quiet\n4. Establish IV access (2 large bore catheters)' },
          { type: 'heading', content: 'Fluid Resuscitation' },
          { type: 'text', content: '• Crystalloids: 60-90 ml/kg/hr IV\n• Colloids: 20-30 ml/kg/hr IV\n• Type and crossmatch for blood transfusion\n• Prepare for emergency surgery' },
          { type: 'heading', content: 'Surgical Intervention' },
          { type: 'text', content: '• Identify and control bleeding source\n• Ligate vessels or repair laceration\n• Remove blood clots and debris\n• Close in appropriate layers' }
        ]
      }
    ]
  },
  {
    category: 'Post-Operative Care',
    items: [
      {
        title: 'Incision Management',
        description: 'Post-operative wound care and monitoring',
        blocks: [
          { type: 'heading', content: 'Daily Incision Checks' },
          { type: 'text', content: '✓ Check for redness or swelling\n✓ Ensure incision is dry\n✓ Monitor for discharge (clear serum normal first 48hrs)\n✓ Ensure sutures/staples intact' },
          { type: 'heading', content: 'When to Call' },
          { type: 'text', content: '• Redness or swelling increasing\n• Foul-smelling discharge\n• Suture/staple dehiscence\n• Discharge is thick, colored, or bloody\n• Animal licking or chewing incision' },
          { type: 'heading', content: 'Activity Restrictions' },
          { type: 'text', content: '• Leash walks only for 10-14 days\n• No running, jumping, or playing\n• No swimming until sutures removed\n• Crate rest when unsupervised' }
        ]
      }
    ]
  }
];

async function seedProtocols() {
  try {
    console.log('Starting protocol seeding...');

    for (const categoryData of protocolData) {
      // Insert category
      const categoryResult = await pool.query(
        'INSERT INTO protocol_categories (name) VALUES ($1) RETURNING id',
        [categoryData.category]
      );
      const categoryId = categoryResult.rows[0].id;
      console.log(`Created category: ${categoryData.category}`);

      // Insert items
      for (const itemData of categoryData.items) {
        const itemResult = await pool.query(
          'INSERT INTO protocol_items (category_id, title, description) VALUES ($1, $2, $3) RETURNING id',
          [categoryId, itemData.title, itemData.description]
        );
        const itemId = itemResult.rows[0].id;
        console.log(`  Created item: ${itemData.title}`);

        // Insert blocks
        for (const blockData of itemData.blocks) {
          await pool.query(
            'INSERT INTO protocol_blocks (item_id, type, content) VALUES ($1, $2, $3)',
            [itemId, blockData.type, blockData.content]
          );
        }
      }
    }

    console.log('\n✓ Protocol seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding protocols:', err);
    process.exit(1);
  }
}

seedProtocols();
