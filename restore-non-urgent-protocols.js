const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Original Non-Urgent protocols from git history (RX_PROTOCOLS)
const nonUrgentProtocols = [
  {
    title: 'Arthritis injections',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'About Librela & Solensia' },
      { type: 'p', text: 'Librela (dogs) and Solensia (cats) are monthly anti-NGF monoclonal antibody injections for osteoarthritis pain. Given once a month by injection at the clinic.' },
      { type: 'h', text: 'Booking Notes' },
      { type: 'b', text: 'Book as a nurse appointment (no vet required for routine injections once established).' },
      { type: 'b', text: 'First injection must be a vet consult to assess suitability and take baseline weight.' },
      { type: 'b', text: 'Note species clearly — Librela is dogs only, Solensia is cats only.' },
      { type: 'b', text: 'Check when their last injection was — ideally every 28–30 days.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Nurse consult (ongoing) / Vet consult (new patient)' },
      { type: 'b', text: 'Duration: 15 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: Current weight, last injection date, any adverse reactions previously' },
    ]
  },
  {
    title: 'Behaviour issues',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Description' },
      { type: 'p', text: 'Behavioural concerns including aggression, anxiety, excessive barking, destructive behaviour, or other behavioural issues.' },
      { type: 'h', text: 'Urgency' },
      { type: 'tip', text: 'NON-URGENT — Routine consultation to assess and manage behavioural concerns.' },
      { type: 'h', text: 'Procedure' },
      { type: 'b', text: 'Book with any vet — general or extended appointment duration depending on complexity.' },
      { type: 'b', text: 'A thorough assessment of the animal\'s history and environment is required.' },
      { type: 'h', text: 'Common Behavioural Issues' },
      { type: 'b', text: 'Aggression towards people or other animals' },
      { type: 'b', text: 'Anxiety or fear-based behaviours' },
      { type: 'b', text: 'Excessive barking or vocalization' },
      { type: 'b', text: 'Destructive behaviour' },
      { type: 'b', text: 'Inappropriate toileting' },
      { type: 'b', text: 'Compulsive behaviours' },
    ]
  },
  {
    title: 'Cat Vaccination',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Vaccine Types' },
      { type: 'b', text: 'F3 (Core): Feline herpesvirus, calicivirus, panleukopenia — recommended for all cats.' },
      { type: 'b', text: 'FIV: Feline immunodeficiency virus — for outdoor or at-risk cats (requires initial course of 3).' },
      { type: 'b', text: 'FeLV: Feline leukaemia virus — for at-risk cats.' },
      { type: 'h', text: 'Booking Notes' },
      { type: 'b', text: 'Book as a vet consult — examination is required with vaccination.' },
      { type: 'b', text: 'Ask if the cat is indoor, outdoor, or has contact with other cats to determine which vaccines are needed.' },
      { type: 'b', text: 'Confirm last vaccination date — annual boosters for F3; FIV requires annual boosters after initial course.' },
      { type: 'b', text: 'If overdue > 1 year, vet will advise on restarting schedule.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: Vaccination history, indoor/outdoor status, any health changes' },
    ]
  },
  {
    title: 'Coughing',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Triage Questions' },
      { type: 'b', text: 'Is the pet having difficulty breathing or is the cough very severe? → Upgrade to same-day/urgent.' },
      { type: 'b', text: 'Is the pet lethargic, off food, or running a temperature? → Book same-day.' },
      { type: 'b', text: 'Mild cough, otherwise well → routine appointment is fine.' },
      { type: 'h', text: 'Kennel Cough (Bordetella / CIRD)' },
      { type: 'p', text: 'Kennel cough is highly contagious. If suspected, advise the owner to keep the pet away from other dogs and call ahead when arriving so we can seat them away from other patients.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: How long coughing, any contact with other dogs, vaccination status (esp. KC vaccine), eating/drinking normally' },
      { type: 'b', text: 'If kennel cough suspected: note on appointment to seat away from other dogs on arrival.' },
    ]
  },
  {
    title: 'Dog Vaccination',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Vaccine Types' },
      { type: 'b', text: 'C3 (Core): Distemper, hepatitis (adenovirus), parvovirus.' },
      { type: 'b', text: 'C5: C3 + Bordetella + Parainfluenza (kennel cough) — required by most boarding/grooming facilities.' },
      { type: 'b', text: 'Leptospirosis: Available if at-risk.' },
      { type: 'h', text: 'Booking Notes' },
      { type: 'b', text: 'Book as a vet consult — full examination required with vaccination.' },
      { type: 'b', text: 'Ask if the dog is boarded, goes to dog parks, or is in contact with other dogs — will determine if C5 is needed.' },
      { type: 'b', text: 'Confirm last vaccination date.' },
      { type: 'b', text: 'Puppies: 6–8 weeks (C3), 10–12 weeks (C5), 14–16 weeks (C3) — then annual.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: Vaccination history, boarding/dog park exposure, any health changes' },
    ]
  },
  {
    title: 'Ear infections',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Triage Questions' },
      { type: 'b', text: 'Shaking head / scratching ear → routine appointment.' },
      { type: 'b', text: 'Tilting head to one side, falling over, or eye twitching → same-day (possible vestibular).' },
      { type: 'b', text: 'Very painful ear, won\'t let you touch it → same-day.' },
      { type: 'h', text: 'Common Causes' },
      { type: 'p', text: 'Ear infections (bacterial/yeast), ear mites (especially cats/puppies), grass seeds, polyps, or allergies are common presentations. A vet examination with otoscope is required to diagnose.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: How long, which ear(s), any smell or discharge, previous ear issues, current medications' },
    ]
  },
  {
    title: 'Lameness/Limping',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Triage Questions' },
      { type: 'b', text: 'Non-weight-bearing or sudden severe lameness → same-day appointment.' },
      { type: 'b', text: 'Mild limp, weight-bearing, no obvious wound → routine appointment.' },
      { type: 'b', text: 'Any swelling, wound, or visible deformity → same-day.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20–30 min' },
      { type: 'b', text: 'Fasting: Not required (advise light fast if sedation may be needed)' },
      { type: 'b', text: 'Notes to collect: Which leg, how long, any known injury/trauma, getting worse or staying the same' },
    ]
  },
  {
    title: 'Skin problems',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Triage Questions' },
      { type: 'b', text: 'Facial swelling, hives all over body → urgent (possible allergic reaction).' },
      { type: 'b', text: 'Scratching, licking, rash, hair loss, hotspot → routine appointment.' },
      { type: 'h', text: 'Common Causes' },
      { type: 'p', text: 'Allergies (environmental, food, flea), bacterial/yeast pyoderma, mange, ringworm, hotspots. Vet will often take cytology samples for diagnosis.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: How long, location on body, any flea prevention used, diet, any previous skin history or allergies' },
    ]
  },
  {
    title: 'Urinary tract infection',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Triage Questions' },
      { type: 'b', text: 'Cat straining and producing no urine → URGENT (possible blockage — life-threatening in male cats).' },
      { type: 'b', text: 'Blood in urine, straining but still urinating → same-day.' },
      { type: 'b', text: 'Frequent urination, accidents, mild signs → routine appointment.' },
      { type: 'h', text: 'Urine Sample' },
      { type: 'tip', text: 'Ask the owner to try to bring a fresh urine sample in a clean container. Collected within 2 hours is ideal. This can save an extra visit and speeds up diagnosis.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: Male or female, how long, any blood visible, how much urine being produced, any diet changes' },
      { type: 'b', text: 'Request fresh urine sample from owner (< 2 hours old, clean container).' },
    ]
  },
  {
    title: 'Consult for bloods (Medication Monitoring)',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'About Senior Wellness Checks & Medication Monitoring' },
      { type: 'p', text: 'Routine blood panels are recommended annually for pets over 7 years (dogs) or 8 years (cats), or at any age if the vet recommends based on clinical signs. Blood monitoring is also essential for pets on chronic medications.' },
      { type: 'h', text: 'Booking Notes' },
      { type: 'b', text: 'Book as a vet consult — examination + blood draw.' },
      { type: 'b', text: 'Patient must be fasted for at least 4–6 hours before the appointment (water is fine).' },
      { type: 'b', text: 'In-house bloods: results same day. If sending to external lab, results in 24–48 hours.' },
      { type: 'warn', text: 'Remind the owner: no food for at least 4–6 hours before the appointment. Water is okay.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20–30 min' },
      { type: 'b', text: 'Fasting: YES — 4–6 hours minimum (water okay)' },
      { type: 'b', text: 'Notes to collect: Any recent health changes, current medications, what bloods were last done and when' },
      { type: 'b', text: 'Fasting required — advise owner when booking.' },
    ]
  },
  {
    title: 'Litter Vaccinations',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'About Litter Vaccinations' },
      { type: 'p', text: 'When a litter of puppies or kittens needs vaccinating, this requires extra appointment time and preparation. Coordinate with the nursing team.' },
      { type: 'h', text: 'Booking Notes' },
      { type: 'b', text: 'Confirm number in litter before booking — allow approximately 10–15 min per animal.' },
      { type: 'b', text: 'Book a vet consult — each animal needs examination + vaccination.' },
      { type: 'b', text: 'Encourage the owner to bring all pups/kittens in one visit.' },
      { type: 'b', text: 'Microchipping can be done at the same time if desired.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult (extended)' },
      { type: 'b', text: 'Duration: 15 min per animal — book accordingly' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: Species, number in litter, age, any already vaccinated' },
    ]
  },
  {
    title: 'Heartworm',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'About SR12' },
      { type: 'p', text: 'ProHeart SR-12 is a 12-month injectable heartworm preventative for dogs. It is given by a veterinarian and provides a full year of heartworm protection with a single injection.' },
      { type: 'h', text: 'Booking Notes' },
      { type: 'b', text: 'First-time patients or those with a lapse in heartworm prevention > 6 months: a heartworm test is recommended prior to injection.' },
      { type: 'b', text: 'Book as a vet consult — the vet must perform an examination before administering.' },
      { type: 'b', text: 'Common to combine with annual vaccination consult.' },
      { type: 'warn', text: 'Do not administer SR-12 to dogs that may already be heartworm positive — always check history.' },
      { type: 'h', text: 'Appointment Panel' },
      { type: 'b', text: 'Appointment type: Vet consult' },
      { type: 'b', text: 'Duration: 20 min' },
      { type: 'b', text: 'Fasting: Not required' },
      { type: 'b', text: 'Notes to collect: Last heartworm prevention date and product used, any lapse in coverage, current weight' },
    ]
  },
];

async function restoreNonUrgentProtocols() {
  try {
    console.log('Restoring NON-URGENT category protocols...\n');

    // Get Non-Urgent category ID
    const catResult = await pool.query(
      'SELECT id FROM protocol_categories WHERE name = $1',
      ['Non-Urgent']
    );

    if (catResult.rows.length === 0) {
      throw new Error('Non-Urgent category not found. Run restore-original-protocols.js first.');
    }

    const categoryId = catResult.rows[0].id;
    console.log(`Found Non-Urgent category (ID: ${categoryId})`);

    // Delete existing items in Non-Urgent to avoid duplicates
    await pool.query(
      'DELETE FROM protocol_items WHERE category_id = $1',
      [categoryId]
    );
    console.log('Cleared existing items\n');

    // Add all non-urgent protocols
    for (const protocol of nonUrgentProtocols) {
      const itemResult = await pool.query(
        'INSERT INTO protocol_items (category_id, title, description) VALUES ($1, $2, $3) RETURNING id',
        [categoryId, protocol.title, protocol.title]
      );
      const itemId = itemResult.rows[0].id;
      console.log(`✓ Added: ${protocol.title}`);

      // Add content blocks
      for (const blockData of protocol.content) {
        await pool.query(
          'INSERT INTO protocol_blocks (item_id, type, content) VALUES ($1, $2, $3)',
          [itemId, blockData.type, blockData.text]
        );
      }
    }

    console.log(`\n✓ Successfully restored ${nonUrgentProtocols.length} NON-URGENT protocols!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restoreNonUrgentProtocols();
