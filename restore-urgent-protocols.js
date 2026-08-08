const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Original urgent protocols from git history (RX_PROTOCOLS)
const urgentProtocols = [
  {
    title: 'Ate a Foreign Object',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'URGENT – Come straight down!' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'Foreign body obstruction is one of the more common and potentially life-threatening conditions in vet practice. An intestinal or stomach obstruction can compromise or cut off blood supply to vital tissues — if this happens, the tissue may die or be irreparable.' },
      { type: 'h', text: 'Common Items Ingested' },
      { type: 'b', text: 'Tissues, articles of clothing (especially underwear & socks), sticks & rocks, food wrappers, bones, children\'s toys, condoms, hair ties (cats).' },
      { type: 'h', text: 'Key Notes' },
      { type: 'b', text: 'Patient will likely need bloodwork, X-rays, or surgery — admit as early in the day as possible.' },
      { type: 'b', text: 'Nurses will triage if a vet is not available. Inform the team the pet is coming down.' },
      { type: 'b', text: 'If eaten within the last 2 hours, we may induce vomiting (if safe).' },
    ]
  },
  {
    title: 'Birthing Difficulties',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'URGENT – Come straight down. An urgent consultation is required for any birthing difficulties.' },
      { type: 'h', text: 'Advice to Clients' },
      { type: 'p', text: 'Refer to the SharePoint document for detailed whelping advice to give clients over the phone.' },
    ]
  },
  {
    title: 'Bloat',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! Death can occur in 1–2 hours. 🚑' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'Bloat occurs when a dog\'s stomach fills with gas, fluid, or food and expands. It becomes life-threatening when the stomach rotates (Gastric Dilation-Volvulus / GDV).' },
      { type: 'h', text: 'Signs of GDV' },
      { type: 'b', text: 'Non-productive retching / attempting to vomit.' },
      { type: 'b', text: 'Visibly bloated or distended abdomen.' },
      { type: 'b', text: 'Drooling, restlessness, panting, collapse.' },
      { type: 'h', text: 'At-Risk Breeds' },
      { type: 'p', text: 'Great Danes, St. Bernards, Weimaraners, Irish Setters, Standard Poodles, Doberman Pinschers. Often occurs after eating. During desexing, a Gastropexy can be performed to prevent GDV.' },
      { type: 'tip', text: 'Book with a senior vet if possible. Dog must be taken straight through to Hospital on arrival.' },
    ]
  },
  {
    title: 'Blocked Bladder (male cat)',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! If untreated within 24–48 hours, the cat can die. 🚑' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'Feline Lower Urinary Tract Disease (FLUTD) affects the urethra and bladder. A male cat that is not urinating freely requires immediate attention — a life-threatening urinary blockage may be present.' },
      { type: 'h', text: 'Key Points' },
      { type: 'b', text: 'Owners often confuse a blocked bladder with constipation — the cat is seen straining in the tray but can\'t pee.' },
      { type: 'b', text: 'The cat may also be licking at their privates excessively.' },
      { type: 'b', text: 'The blockage causes acute kidney failure.' },
      { type: 'tip', text: 'If a client says "My cat is constipated" — explain it\'s most likely they can\'t pee (if male) and they need to come down immediately.' },
    ]
  },
  {
    title: 'Chocolate Toxicity',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'Dogs cannot metabolise theobromine (the main toxin in chocolate). The darker the chocolate, the more toxic it is. Symptoms can take 6–12 hours to develop.' },
      { type: 'h', text: 'Key Notes' },
      { type: 'b', text: 'Ask the client to bring the chocolate wrapper — it helps calculate theobromine ingested.' },
      { type: 'b', text: 'If eaten within 1–2 hours, the vet may induce vomiting.' },
      { type: 'b', text: 'Larger dogs can consume more before reaching toxic levels.' },
      { type: 'tip', text: 'Chocolate Toxicity Calculator (guide only): https://petsci.co.uk/tools/chocolate-toxicity-calculator/ — All clients should still be advised to bring the patient in immediately.' },
    ]
  },
  {
    title: 'Dog Attacks/Fights',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'RED – Come straight down!' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'Not all bite wounds tear the skin, but they can cause significant internal crushing damage. Even small punctures can mean significant internal trauma. All animals involved in dog attacks need to be seen immediately.' },
      { type: 'h', text: 'What to Expect' },
      { type: 'b', text: 'Vet will perform a physical exam and may start life-saving interventions immediately.' },
      { type: 'b', text: 'Pain relief and antibiotics administered. Surgery is often required to debride and close wounds.' },
      { type: 'b', text: 'Puncture wounds can reach the abdomen (organ damage) or chest (lung puncture). Emergency surgery may be needed.' },
      { type: 'b', text: 'Blood tests and potentially a blood transfusion may be required for severe injuries.' },
      { type: 'tip', text: 'Notify the Hospital Manager that this patient is coming down so they can be prepared.' },
    ]
  },
  {
    title: 'Difficulty breathing',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! Not being able to breathe is not good! 🚑' },
      { type: 'h', text: 'If Heatstroke — Advice to Clients' },
      { type: 'p', text: 'If arrival will be delayed (waiting for transport, help lifting pet etc), ask the client to:' },
      { type: 'b', text: 'Remove the pet from the hot environment immediately.' },
      { type: 'b', text: 'Apply tepid/cool (NOT ice-cold) water to fur and skin, then fan to maximise heat loss.' },
      { type: 'b', text: 'Wet down the area around the pet where possible.' },
      { type: 'b', text: 'Get to the clinic as soon as possible.' },
      { type: 'h', text: 'Potential Causes' },
      { type: 'b', text: 'BOAS (Brachycephalic Airway Syndrome): French Bulldogs, Boxers, Bulldogs, Boston Terriers, Shih Tzus, Pekinese, Pugs — these breeds have shortened airways and overheat easily.' },
      { type: 'b', text: 'Heatstroke: Extremely dangerous and can be fatal.' },
      { type: 'tip', text: 'Tell the Hospital Leader an animal is coming in with trouble breathing so they can prepare the hospital.' },
    ]
  },
  {
    title: 'Food Toxicity',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'Toxic Foods' },
      { type: 'b', text: 'Chocolate (see Chocolate Toxicity protocol), Onions, Garlic, Grapes, Sultanas, Macadamia Nuts.' },
      { type: 'h', text: 'Key Notes' },
      { type: 'b', text: 'If eaten recently, the vet may induce vomiting.' },
      { type: 'b', text: 'IV fluids and other medications may be required depending on amount eaten and patient size/breed.' },
      { type: 'tip', text: 'Animal Poisons Reference: https://animalpoisons.com.au/common-poisons' },
    ]
  },
  {
    title: 'Heat Stroke',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'Signs of Heat Stroke' },
      { type: 'b', text: 'Excessive panting, drooling, weakness, collapse, vomiting, diarrhea, seizures.' },
      { type: 'h', text: 'Immediate First Aid' },
      { type: 'b', text: 'Remove from heat source immediately.' },
      { type: 'b', text: 'Apply cool (NOT ice-cold) water to body and fan.' },
      { type: 'b', text: 'Transport to clinic immediately.' },
      { type: 'tip', text: 'Heat stroke is life-threatening and requires emergency treatment.' },
    ]
  },
  {
    title: 'Hit by car',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'Advice to Clients' },
      { type: 'b', text: 'Approach the animal with caution — an injured, frightened dog or cat may bite even if they know you.' },
      { type: 'b', text: 'Large dogs: carefully slide a board, blanket, or towel underneath to use as a stretcher. Always support the back.' },
      { type: 'b', text: 'Small dogs and cats: wrap in a towel to move. Don\'t wrap too tight.' },
      { type: 'h', text: 'Key Notes' },
      { type: 'p', text: 'Even a small bump from a car can cause serious internal injuries that are not yet apparent. A ruptured diaphragm causes immediate lung collapse with no visible external injuries. All HBC patients should come straight down regardless of visible injuries. They may also need treatment for shock.' },
    ]
  },
  {
    title: 'Lilly Toxicity (Cat)',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'All parts of the Lily are toxic to cats — including pollen and leaves (flowers are most toxic). As little as two leaves or part of a flower can result in death.' },
      { type: 'h', text: 'Timeline' },
      { type: 'b', text: 'Acute renal failure can occur within 12–18 hours of ingestion.' },
      { type: 'b', text: 'Sudden death has been reported after 6–8 hours (depending on amount consumed).' },
      { type: 'tip', text: 'If treated within 18 hours of exposure, the prognosis is good for the patient.' },
    ]
  },
  {
    title: 'Milk fever',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'URGENT – Come down as soon as possible.' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'Milk fever (eclampsia) is a metabolic emergency in nursing mothers, typically occurring 1-4 weeks after giving birth.' },
      { type: 'h', text: 'Signs' },
      { type: 'b', text: 'Stiffness, tremors, muscle twitching, nervousness, panting, lethargy, loss of appetite.' },
      { type: 'h', text: 'Key Notes' },
      { type: 'b', text: 'Requires immediate veterinary treatment with IV calcium.' },
    ]
  },
  {
    title: 'Pet ate prescription medication, or illegal drugs',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'Common Drugs Ingested' },
      { type: 'p', text: 'Panadol (Paracetamol), Nurofen (Ibuprofen), Aspirin, Valium, Sleeping tablets, Blood pressure medication, Beta blockers, Benzodiazepines, Xanax, Antidepressants (Effexor, Prozac, Lexapro), ADHD medications (Ritalin), Birth control pills, Thyroid hormones, Statins, Marijuana.' },
      { type: 'h', text: 'Key Notes' },
      { type: 'b', text: 'Ask the client to bring down the bottle/packaging.' },
      { type: 'b', text: 'If eaten recently, the vet may induce vomiting.' },
      { type: 'b', text: 'IV fluids and other medications may be required. Many of these can cause liver damage if not treated promptly.' },
      { type: 'tip', text: 'Poisons Helpline: 1300 869 738 | Animal Poisons: https://animalpoisons.com.au/common-poisons' },
    ]
  },
  {
    title: 'Poisoning (Rat Bait)',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'Rodenticides act as anticoagulants — they deplete the body\'s supply of vitamin K, which is essential for blood clotting. This causes internal bleeding, brain swelling, and high calcium levels (leading to kidney failure).' },
      { type: 'h', text: 'Key Notes' },
      { type: 'b', text: 'Death from internal bleeding: 3–7 days. Animals can remain symptom-free for many days, giving a false sense of reassurance.' },
      { type: 'b', text: 'Ask the client to bring down the rat bait packaging.' },
      { type: 'b', text: 'If eaten recently, the vet may induce vomiting.' },
      { type: 'tip', text: 'Poisons Helpline: 1300 869 738' },
    ]
  },
  {
    title: 'Seizures',
    urgency: 'urgent',
    content: [
      { type: 'tip', text: 'URGENT but not an immediate emergency — come down when the seizure finishes and the dog is near normal again.' },
      { type: 'h', text: 'Advice if Animal is Currently Seizing' },
      { type: 'b', text: 'Don\'t panic! Most seizures last only a minute or so. Remove anything nearby that could cause injury.' },
      { type: 'b', text: 'No need to hold or comfort them — let it run its course. If in a dangerous area (e.g. stairwell), gently move them to a safer spot.' },
      { type: 'b', text: 'No food or water — it can make it hard to breathe.' },
      { type: 'h', text: 'After the Seizure' },
      { type: 'p', text: 'Keep the dog in a safe area and monitor through the post-ictal phase (lethargy, restlessness, wobbly, temporary blindness, possible aggression). Once mostly back to normal, bring them in.' },
      { type: 'warn', text: 'Come down IMMEDIATELY if: seizure lasts > 5–10 minutes, seizures cluster together without recovery time, or more than 2 seizures in 24 hours.' },
    ]
  },
  {
    title: 'Snake Bite',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! Waiting to monitor the situation reduces the chance of survival. 🚑' },
      { type: 'h', text: 'Advice to Clients' },
      { type: 'b', text: 'Do NOT try to catch or kill the snake.' },
      { type: 'b', text: 'Keep the pet calm — over-excitement can worsen venom effects.' },
      { type: 'b', text: 'Carry the pet to the car to minimise movement.' },
      { type: 'b', text: 'If bite is on the face or neck, remove the collar as the area may swell.' },
      { type: 'b', text: 'At a safe distance, photograph the snake or note its pattern and colour to help identify it.' },
      { type: 'h', text: 'Signs of Snake Bite' },
      { type: 'b', text: 'Sudden weakness/collapse, muscle shaking or twitching, difficulty blinking, vomiting, loss of bladder/bowel control, dilated pupils, paralysis, blood in urine.' },
      { type: 'tip', text: 'Gold Coast Snake Catcher — Tony Harrison: 0401 263 296' },
    ]
  },
  {
    title: 'Tick Paralysis',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'Advice to Clients' },
      { type: 'b', text: 'If you\'ve removed the tick, please bring it in for identification in a sealed bag, jar, or container.' },
      { type: 'b', text: 'Do NOT offer any food or water.' },
      { type: 'h', text: 'About' },
      { type: 'p', text: 'The paralysis tick is a pink, egg-shaped arachnid (~3–5mm). Early treatment is key — deterioration can occur within hours. Even after tick removal, pets can worsen for up to 3 days, and the poison remains active in the system for 1–2 weeks.' },
      { type: 'h', text: 'Early Signs' },
      { type: 'b', text: 'Lethargy, reduced appetite, occasional vomiting.' },
      { type: 'h', text: 'Later Signs (URGENT)' },
      { type: 'b', text: 'Wobbly gait (often back legs), reluctance to move or jump, change in bark or meow, cannot blink, difficulty breathing, change in heart rhythm, excessive drooling, complete paralysis.' },
    ]
  },
  {
    title: 'Toad Toxicity',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'If the Dog is Seizing or Having Tremors' },
      { type: 'b', text: 'Bring straight down to the clinic immediately.' },
      { type: 'h', text: 'If the Dog Has Just Licked the Toad' },
      { type: 'p', text: 'Use a damp cloth to wipe the inside of the dog\'s mouth (especially the roof) to remove the toxin. Rinse the cloth under cool running water after every wipe. Continue for 10–20 minutes. Be cautious — dogs may bite. NEVER use a hose to flush the mouth — this can cause the dog to inhale water causing life-threatening pneumonia. Bring the dog to us immediately after wiping.' },
      { type: 'h', text: 'Symptoms' },
      { type: 'b', text: 'Drooling and foaming, brick-red gum colour, vomiting, diarrhoea, loss of coordination, rapid or irregular heartbeat, seizures, collapse.' },
      { type: 'h', text: 'How Long Until Dangerous?' },
      { type: 'p', text: 'The adult cane toad has enough toxin to kill an average-sized dog in as little as 15 minutes. The smaller the dog or cat, the more seriously affected they will be.' },
    ]
  },
  {
    title: 'Trauma (open wound, bleeding or dog attack)',
    urgency: 'urgent',
    content: [
      { type: 'warn', text: 'EMERGENCY – Come straight down! 🚑' },
      { type: 'h', text: 'Advice to Clients — Controlling Bleeding' },
      { type: 'b', text: '1. Apply direct pressure using a clean cloth or towel.' },
      { type: 'b', text: '2. Do not keep removing pressure to examine the wound.' },
      { type: 'b', text: '3. Do not bathe the wound.' },
      { type: 'b', text: '4. Bring someone with you so they can maintain pressure while you drive.' },
      { type: 'b', text: '5. If bleeding is minimal, place the animal on a towel and come straight down. Drive calmly and safely.' },
      { type: 'h', text: 'Key Notes' },
      { type: 'p', text: 'Small skin punctures are deceptive — the damage underneath can be far worse than on top. Dog jaws are extremely powerful and can crush muscles, penetrate the chest wall (lung collapse), or cause serious organ damage.' },
      { type: 'tip', text: 'Ensure you tell the Hospital Leader that a wounded animal is coming down so they can be prepared.' },
    ]
  },
];

async function restoreUrgentProtocols() {
  try {
    console.log('Restoring URGENT category protocols...\n');

    // Get Urgent category ID
    const catResult = await pool.query(
      'SELECT id FROM protocol_categories WHERE name = $1',
      ['Urgent']
    );

    if (catResult.rows.length === 0) {
      throw new Error('Urgent category not found. Run restore-original-protocols.js first.');
    }

    const categoryId = catResult.rows[0].id;
    console.log(`Found Urgent category (ID: ${categoryId})`);

    // Delete existing items in Urgent to avoid duplicates
    await pool.query(
      'DELETE FROM protocol_items WHERE category_id = $1',
      [categoryId]
    );
    console.log('Cleared existing items\n');

    // Add all urgent protocols
    for (const protocol of urgentProtocols) {
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

    console.log(`\n✓ Successfully restored ${urgentProtocols.length} URGENT protocols!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restoreUrgentProtocols();
