const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Original Same Day protocols from git history (RX_PROTOCOLS)
const sameDayProtocols = [
  {
    title: 'Eye concerns',
    urgency: 'sameday',
    content: [
      { type: 'h', text: 'Description' },
      { type: 'p', text: 'Any condition of the eye.' },
      { type: 'h', text: 'Urgency' },
      { type: 'tip', text: 'ORANGE: Book at next available time — should be a same-day appointment.' },
      { type: 'h', text: 'Procedure' },
      { type: 'b', text: 'Book with any vet — general appointment duration.' },
      { type: 'b', text: 'Any sign of eye problems should mean an immediate appointment due to the risk of permanent damage caused by delay. Left untreated, an eye problem can lead to pain, blindness and loss of the eye.' },
      { type: 'b', text: 'Eye issues (even if mild) are also extremely painful.' },
      { type: 'h', text: 'Common Signs' },
      { type: 'b', text: 'Rubbing the eye or pawing at the eyes.' },
      { type: 'b', text: 'Weepy or watery eyes.' },
      { type: 'b', text: 'Cloudy eyes.' },
      { type: 'b', text: 'Discharge from the eyes.' },
      { type: 'b', text: 'Reduced vision or bumping into things.' },
      { type: 'b', text: "Change in the pupil's appearance." },
      { type: 'b', text: 'Red or swollen eyes.' },
      { type: 'b', text: 'Squinting.' },
      { type: 'b', text: 'Swelling.' },
      { type: 'b', text: 'Night blindness.' },
      { type: 'h', text: 'Animal Eye Services' },
      { type: 'b', text: 'Vet: Dr Tom Donnelly-Newton' },
      { type: 'b', text: 'All Bookings: (07) 3341 1981' },
    ]
  },
  {
    title: 'Insect bite toxicity (swollen face from bee sting, ant bite etc)',
    urgency: 'sameday',
    content: [
      { type: 'h', text: 'Description' },
      { type: 'p', text: 'Pet has been bitten by an ant, bee, wasp etc.' },
      { type: 'h', text: 'Urgency' },
      { type: 'tip', text: 'RED OR ORANGE: Assess severity — determine if the pet is having an allergic reaction!' },
      { type: 'h', text: 'Procedure' },
      { type: 'b', text: 'Book with any vet — general appointment duration.' },
      { type: 'warn', text: "If the patient has swelling, vomiting/diarrhoea, or can't breathe, they must come down immediately — possible anaphylactic reaction!" },
      { type: 'h', text: 'For Your Information' },
      { type: 'b', text: 'Pet can be showing signs of pain and irritation eg licking or chewing at the area bitten, or limping/not weight bearing. The bite is usually in an area with little hair eg foot pads, belly or face/nose.' },
      { type: 'b', text: 'If the pet is showing signs of discomfort only or localised pain at the bite site (none of the serious symptoms above), we should still see the pet. The vet may choose to give an anti-histamine injection or pain relief to make the animal more comfortable.' },
      { type: 'b', text: 'Always recommend the patient be seen. Book an appointment as soon as possible — if there is no appointment, an urgent slot will need to be made and the client charged accordingly.' },
      { type: 'b', text: 'A patient may also present with lumps or hives on their body (all over, or in certain areas).' },
      { type: 'h', text: "If the Owner Can't or Won't Come In" },
      { type: 'p', text: 'Owner can apply a cold compress (wrapped in a light tea towel) to the bite for up to 10 minutes and monitor the pet at home over the next 24 hours. They may also put the limb into a cold water foot bath if the foot was bitten.' },
      { type: 'p', text: 'It is important the client watches the pet for 24 hours. They must come down immediately or go to the Emergency Centre (if after hours) if any of these signs develop:' },
      { type: 'b', text: 'Swelling on face.' },
      { type: 'b', text: 'Vomiting & diarrhoea.' },
      { type: 'b', text: 'Weakness.' },
      { type: 'b', text: 'Difficulty breathing.' },
      { type: 'b', text: 'Agitation.' },
    ]
  },
  {
    title: 'Lethargic & not eating',
    urgency: 'sameday',
    content: [
      { type: 'h', text: 'Description' },
      { type: 'p', text: 'Pet is not interested in eating at all or will only eat small amounts. Their eating habits have changed. Pet may also be lethargic or showing no interest in activity.' },
      { type: 'h', text: 'Urgency' },
      { type: 'tip', text: 'Urgent — assess urgency by asking appropriate questions.' },
      { type: 'h', text: 'Procedure' },
      { type: 'b', text: 'Book with any vet — general appointment duration.' },
      { type: 'b', text: 'Book an early appointment where possible in case further workup is required eg blood tests.' },
      { type: 'h', text: 'For Your Learning' },
      { type: 'p', text: 'Loss of appetite in pets is a common symptom. The cause can be as simple as a mild stomach upset, but it could also be a sign of serious disease.' },
      { type: 'p', text: 'Common reasons for pets to be off their food:' },
      { type: 'b', text: 'Dental issues.' },
      { type: 'b', text: 'Pain.' },
      { type: 'b', text: 'Nausea.' },
      { type: 'b', text: 'Stress.' },
      { type: 'b', text: 'Adverse reaction to drugs.' },
      { type: 'b', text: 'Internal obstructions.' },
      { type: 'b', text: 'Changes in the environment.' },
      { type: 'b', text: 'Kidney failure.' },
      { type: 'b', text: 'Pancreatitis.' },
      { type: 'b', text: 'Cancer.' },
      { type: 'b', text: 'Gastroenteritis.' },
      { type: 'b', text: 'Infection.' },
      { type: 'h', text: 'Questions to Ask' },
      { type: 'b', text: 'How long has the pet been off food?' },
      { type: 'b', text: 'Is the pet vomiting or having diarrhoea?' },
      { type: 'b', text: 'Has the pet experienced weight loss?' },
      { type: 'b', text: 'Does the pet have any underlying medical conditions?' },
    ]
  },
  {
    title: 'Vomiting & Diarrhoea',
    urgency: 'sameday',
    content: [
      { type: 'h', text: 'Description' },
      { type: 'p', text: 'Vomiting: Most commonly a reaction to a minor stomach upset but can be a sign of something serious.' },
      { type: 'p', text: 'Diarrhoea: Caused by a variety of factors, including dietary indiscretion, food allergies or sensitivities, infections, parasites, and certain medical conditions.' },
      { type: 'h', text: 'Urgency' },
      { type: 'tip', text: 'RED OR ORANGE: Assess severity.' },
      { type: 'h', text: 'Procedure' },
      { type: 'b', text: 'Book with any vet — general appointment duration.' },
      { type: 'b', text: 'Vomiting should be seen as early as possible in case the patient needs working up.' },
      { type: 'h', text: 'When Is It Urgent?' },
      { type: 'warn', text: 'Blood in the vomit — must be seen straight away.' },
      { type: 'warn', text: 'Bloody diarrhoea — must be seen straight away.' },
      { type: 'warn', text: 'Heatstroke — if the animal is overheating and vomiting, this is a medical emergency.' },
      { type: 'h', text: 'Advice to Clients' },
      { type: 'b', text: 'If diarrhoea is present — ask the client to bring in a sample if possible (clean plastic container or glass jar with lid). No need to refrigerate.' },
      { type: 'h', text: 'Some Causes (Not a Full List)' },
      { type: 'b', text: 'Ate too much.' },
      { type: 'b', text: 'Ate too fast — regurgitation straight after eating.' },
      { type: 'b', text: 'Ate grass.' },
      { type: 'b', text: 'Diet change or food intolerance.' },
      { type: 'b', text: 'Viral infections.' },
      { type: 'b', text: 'Motion sickness.' },
      { type: 'b', text: 'Heatstroke.' },
      { type: 'b', text: 'Swallowed something toxic.' },
      { type: 'b', text: 'Sign of serious illness eg pancreatitis, liver issues, constipation, parvo, urine infection, kidney issues.' },
      { type: 'h', text: 'Possible Treatments' },
      { type: 'p', text: 'Strongly depends on the cause of vomiting, but may include:' },
      { type: 'b', text: 'Medication and sent home.' },
      { type: 'b', text: 'Admitted to hospital for further workup which may include blood tests, X-rays or ultrasound.' },
    ]
  },
];

async function restoreSameDayProtocols() {
  try {
    console.log('Restoring SAME DAY category protocols...\n');

    // Get Same Day category ID
    const catResult = await pool.query(
      'SELECT id FROM protocol_categories WHERE name = $1',
      ['Same Day']
    );

    if (catResult.rows.length === 0) {
      throw new Error('Same Day category not found. Run restore-original-protocols.js first.');
    }

    const categoryId = catResult.rows[0].id;
    console.log(`Found Same Day category (ID: ${categoryId})`);

    // Delete existing items in Same Day to avoid duplicates
    await pool.query(
      'DELETE FROM protocol_items WHERE category_id = $1',
      [categoryId]
    );
    console.log('Cleared existing items\n');

    // Add all same day protocols
    for (const protocol of sameDayProtocols) {
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

    console.log(`\n✓ Successfully restored ${sameDayProtocols.length} SAME DAY protocols!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restoreSameDayProtocols();
