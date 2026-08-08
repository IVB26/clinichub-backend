const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Original General Surgery protocols from git history (RX_PROTOCOLS)
const generalSurgeryProtocols = [
  {
    title: 'Desexing',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Cats — Best Age to Desex' },
      { type: 'p', text: 'The best age for all cats to be desexed is between 5-6 months of age.' },
      { type: 'h', text: 'Mixed Breed Dog — Age to Desex Chart' },
      { type: 'b', text: '0–10kg — Small/Toy' },
      { type: 'b', text: '10–20kg — Medium' },
      { type: 'b', text: '20–40kg — Large' },
      { type: 'b', text: '40kg+ — Giant' },
      { type: 'h', text: 'Purebred Dog — Reception Script' },
      { type: 'tip', text: 'Don\'t be afraid to tell the client you are going to read this out. Eg: Simply say, "Mrs {clientname}, there\'s been some changes to the desexing age protocol. Let me read some information out to you from my program here" — or of course you can rope learn it!' },
      { type: 'p', text: 'New research indicates that there are some benefits in delaying desexing for certain breeds. The research is inconclusive though, so until more information is available, we are still desexing at 5-9 months. You can however discuss the latest research with one of our vets to work out an age that is best suited for your pet, taking into consideration this new research.' },
      { type: 'p', text: 'If you wish to discuss it with a vet, I can go ahead and book you a Telehealth appointment which is cheaper than coming in ($55.00). If you didn\'t want to discuss it, our other choices are:' },
      { type: 'b', text: '1. Traditional Desexing at ages 5-7 months, as commonly practiced.' },
      { type: 'b', text: '2. Desexing at an age incorporating the latest research, but is generalised (use chart above).' },
      { type: 'h', text: 'If the Client Seems Confused — Say:' },
      { type: 'p', text: 'Mrs {clientname}, it\'s a lot to take in, but we\'re here to help you. Why don\'t we book {petname} in at our usual time of 5-7 months and I\'ll send you some more info now. If after reading the info you change your mind, we can easily change the appointment for you. How does that sound?' },
      { type: 'h', text: 'Telehealth Appointment' },
      { type: 'b', text: '$55.00 — Payable via C/C at time of call' },
      { type: 'b', text: 'Send client link: https://shorter.me/Ki-DY' },
      { type: 'h', text: 'For Your Learning' },
      { type: 'tip', text: 'Familiarise yourself with what is contained in the link you are going to send the client. You should know what you\'re sending them!' },
      { type: 'b', text: 'Best time to desex your pet — TVL Website: https://shorter.me/Ki-DY' },
      { type: 'h', text: 'Desexing Booking Protocol' },
      { type: 'tip', text: 'NOT URGENT — Routine surgery' },
      { type: 'h', text: 'General Information' },
      { type: 'b', text: 'Routine Castrations & Speys can be booked with any vet, but ask if there is a vet they prefer.' },
      { type: 'b', text: 'Note: Recent graduate vets may not be able to desex large female dogs without supervision (check surgery sheet).' },
      { type: 'b', text: 'Procedures performed every weekday Monday–Friday.' },
      { type: 'h', text: 'Laparoscopic/Keyhole Surgery (Female or Retained Testicle)' },
      { type: 'b', text: 'Available at Coomera only, with Dr Andres or Dr Winnie.' },
      { type: 'b', text: 'One laparoscopic procedure per day only as it takes 12 hours to resterilise equipment before it can be used again.' },
      { type: 'h', text: 'Questions to Ask Before Making Appointment' },
      { type: 'h', text: 'Female' },
      { type: 'b', text: 'Is your dog currently in season? If yes — surgery should be delayed for 2 months. When an animal is in season, there is an increased blood supply to both the uterus and the ovaries. This can make the surgery more complicated.' },
      { type: 'h', text: 'Male' },
      { type: 'b', text: 'Are both his testicles in the scrotum? If no — surgery is more complicated because the undescended testicle/s must be located first, and they are often much smaller in size. Exploratory surgery (opening the abdominal cavity) may be required, as the undescended testicle can be anywhere between the scrotum and the kidneys.' },
      { type: 'h', text: 'Booking the Appointment' },
      { type: 'p', text: 'Make appointment time first, so you have the client file ready.' },
      { type: 'b', text: 'Admission times: 8.00am–9.00am — allocate 10 minutes. Try to make the first admission at 8.10 where possible. Don\'t double book! Look to see what times are already taken!' },
      { type: 'b', text: 'How to: Write admit time first in REASON field eg "8.20 admit Cat Castration" or "Large Mature Dog Spey".' },
      { type: 'b', text: 'Note: If the client has not visited a Vet Lounge practice, the admission must be booked with a vet. Make the appointment in both the surgery field AND an appointment slot for the same time as admit.' },
      { type: 'h', text: 'Read the Following to the Client' },
      { type: 'b', text: 'Now that we have the appointment made, I\'m going to send you a very important SMS which holds a link to all the information you need to know about the procedure, and also what you need to do to prepare for surgery, including information about withholding food & water.' },
      { type: 'b', text: 'There will also be information on anaesthetic safety, and what after-care will be required, like caring for stitches and when we need to see you back.' },
      { type: 'b', text: 'Can I confirm the mobile we have on file (read out mobile) is the best one to send this information to? (Send the text NOW!)' },
      { type: 'b', text: 'A surgical nurse will call you the day before to confirm the procedure and answer any further questions you may have.' },
      { type: 'b', text: 'Is there anything else I can help you with today?' },
      { type: 'b', text: 'Look forward to seeing you on {appt day}.' },
    ]
  },
  {
    title: 'Exotic Surgery eg Birds & Guinea Pigs',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'Read the Following to the Client After Booking' },
      { type: 'p', text: 'Now that we have the appointment made, I\'m going to send you an SMS with a link to all of the information you\'ll need to prepare for surgery.' },
      { type: 'p', text: 'Continue with their usual feeding routine. It is important that food NOT be withheld prior to admission as small animals have a higher metabolic rate than cats or dogs so fasting may cause gastrointestinal complications. Due to this, we also need you to pack them a lunch including their favourite food, so we can offer this to them during recovery.' },
      { type: 'p', text: 'There will also be information on after-care, like caring for stitches (if required) & when you need to come back & see us. It will also go through the potential risks & complications for an anaesthetic for birds & small animals. You should receive that text any moment with the link.' },
      { type: 'p', text: 'If you have any further questions, give us a call and we\'d be happy to help you again.' },
      { type: 'warn', text: 'Make sure the mobile number is correct and send the SMS before you hang up!' },
      { type: 'h', text: 'Making an Appointment — Birds, Guinea Pigs, Rats & Mice' },
      { type: 'warn', text: 'All patients must have been seen by one of our vets PRIOR to making a surgical booking. If they have not been seen before, make a consultation time at least 1 day prior to the procedure date.' },
      { type: 'b', text: '1. Check client file to ensure mobile number is correct (or make up a client file).' },
      { type: 'b', text: '2. Ensure you book the procedure on a day that we have an Exotic Vet on — not all vets can perform exotic surgery.' },
      { type: 'b', text: '3. Book into correct column eg General surgery, Xrays etc.' },
      { type: 'b', text: '4. When making appointment, ensure the Admit Time is first followed by the procedure eg "8.10am admit — Rat lump removal".' },
      { type: 'b', text: '5. Be clear about the booking — don\'t just write "Lump removal". Is it a Guinea Pig? Is it a rat? Is it a bird? BE CLEAR!' },
      { type: 'b', text: 'Admission times: 8.00am–9.00am — allocated 10 minutes.' },
      { type: 'h', text: 'Important Notes' },
      { type: 'b', text: 'Do NOT withhold food for birds, guinea pigs, rats & mice prior to surgery.' },
    ]
  },
  {
    title: 'Cat Grooms',
    urgency: 'non-urgent',
    content: [
      { type: 'tip', text: 'NOT URGENT — Routine procedure performed under anaesthetic.' },
      { type: 'h', text: 'Advice to Clients' },
      { type: 'p', text: '"It\'s important I don\'t miss anything with regards to booking the groom, so I\'m going to read out some information from the checklist that I have. This will make sure we book the procedure perfectly".' },
      { type: 'h', text: 'Food & Water' },
      { type: 'b', text: 'No food after 10pm the night before the groom.' },
      { type: 'b', text: 'No water after 8am the morning of the procedure. Your cat can drink overnight.' },
      { type: 'h', text: 'Admission Time' },
      { type: 'b', text: 'Surgical admission times start at 8am and take around 5–10 minutes.' },
      { type: 'b', text: 'I will send you an SMS with a link to a video that will go over everything you need to know prior to your cat coming in. Please make sure you watch the video.' },
      { type: 'warn', text: 'Send the client the text message now!' },
      { type: 'h', text: 'For Your Information' },
      { type: 'p', text: 'There are various reasons why cats may need to be shaved, but the most common reasons are to remove matted hair, and to help keep cats cool during warmer weather. Cats with long coats should be brushed daily, but some cats don\'t tolerate brushing very well and make the process near impossible for their loving owners.' },
      { type: 'p', text: 'It\'s also difficult for long haired cats to regulate their body temperature on hot, humid days, so keeping their hair nice and short will help prevent them from overheating. Some cats have an extreme fear, or anxiety response to grooming procedures and will react with biting and scratching. This can lead to stress-induced health issues. To keep both your cat & our nurse safe, we only groom cats under anaesthetic.' },
      { type: 'p', text: 'While the groom itself is routine, there is no such thing as a routine anaesthetic or an easy anaesthetic. Putting an animal under anaesthetic is never without risk, so it\'s important for us to follow our usual procedures to ensure your cat will be as safe as possible while under anaesthetic.' },
      { type: 'warn', text: 'A pre-anaesthetic blood test is compulsory for all cats over the age of 8 years. At the age of 8, cats are classed as Geriatric, and older animals can experience age-related changes in their organ function.' },
      { type: 'p', text: 'Impaired organ function can affect how the body processes and eliminates anaesthetic drugs, potentially increasing the risk of complications. By identifying potential health concerns before an anaesthetic is given, vets and pet owners can make informed decisions about whether to proceed.' },
      { type: 'p', text: 'If you are a new client and your cat has not been seen by one of our veterinarians, a consultation will be required prior to admission. We can book this in on the morning of your cat\'s groom. For existing clients, a consultation is not required if your cat has had a physical exam in the past 12 months and received a clean bill of health. For cats with underlying medical conditions, we must have seen your cat within the past 6 months.' },
      { type: 'p', text: 'Please make sure they have not had anything to eat after 10pm the night before the groom. It is safe for a cat to continue to drink overnight, but remove the water bowl in the morning when you wake up.' },
      { type: 'h', text: 'Groom Choices' },
      { type: 'b', text: 'Long mane or short mane' },
      { type: 'b', text: 'Boots or socks' },
      { type: 'b', text: 'Lion tail or full tail' },
      { type: 'p', text: 'When your cat goes home, please ensure they are kept inside until the following morning. Your cat is able to eat and drink as normal when you go home.' },
      { type: 'h', text: 'Appointment Panel Notes' },
      { type: 'b', text: 'Existing VL client? YES — consultation required if not seen in 12 months (healthy cats) or 6 months (underlying conditions). Advise there may be a consultation fee.' },
      { type: 'b', text: 'Existing VL client? NO — must have a consultation booked at admission. Advise there will be a consultation fee.' },
      { type: 'b', text: 'Cat 8 years or older? Pre-anaesthetic blood test is compulsory.' },
      { type: 'b', text: 'If consultation required: book in surgical column AND in a vet\'s column at the same admit time eg "8.20 Vet Admit — Cat Clip — New Client".' },
      { type: 'warn', text: 'Make sure you send the text with the cat video! It goes through all pre & post op info & what to expect. Cat Clip SMS: https://rb.gy/pdxax' },
    ]
  },
  {
    title: 'Progress Exams & Surgical Follow up Times',
    urgency: 'non-urgent',
    content: [
      { type: 'h', text: 'About Progress Exams' },
      { type: 'p', text: 'Progress exams are follow-up consultations to assess healing and recovery after surgical procedures.' },
      { type: 'h', text: 'Timing Guidelines' },
      { type: 'b', text: 'Desexing: 10-14 days post-op for suture removal' },
      { type: 'b', text: 'Dental procedures: 7-10 days post-op' },
      { type: 'b', text: 'Orthopaedic surgery: 14 days post-op, then 6-8 weeks' },
      { type: 'b', text: 'Soft tissue surgery: 10-14 days for suture removal' },
      { type: 'b', text: 'Trauma repair: As recommended by vet' },
      { type: 'h', text: 'What to Check During Progress Exam' },
      { type: 'b', text: 'Incision healing and any signs of infection' },
      { type: 'b', text: 'Swelling or discharge' },
      { type: 'b', text: 'Patient\'s pain level and comfort' },
      { type: 'b', text: 'Movement and activity level' },
      { type: 'b', text: 'Removal of sutures or staples if appropriate' },
      { type: 'h', text: 'Booking Progress Exams' },
      { type: 'b', text: 'Schedule at time of initial surgery booking' },
      { type: 'b', text: 'Can be a nurse appointment (vet approval required)' },
      { type: 'b', text: 'Allow 15 minutes for consultation' },
      { type: 'h', text: 'Post-Operative Instructions' },
      { type: 'b', text: 'Provide written discharge instructions at surgery' },
      { type: 'b', text: 'Remind clients to follow restricted activity guidelines' },
      { type: 'b', text: 'Advise on wound care and monitoring' },
      { type: 'b', text: 'Provide contact details for after-hours concerns' },
    ]
  },
];

async function restoreGeneralSurgeryProtocols() {
  try {
    console.log('Restoring GENERAL SURGERY category protocols...\n');

    // Get General Surgery category ID
    const catResult = await pool.query(
      'SELECT id FROM protocol_categories WHERE name = $1',
      ['General Surgery']
    );

    if (catResult.rows.length === 0) {
      throw new Error('General Surgery category not found. Run restore-original-protocols.js first.');
    }

    const categoryId = catResult.rows[0].id;
    console.log(`Found General Surgery category (ID: ${categoryId})`);

    // Delete existing items in General Surgery to avoid duplicates
    await pool.query(
      'DELETE FROM protocol_items WHERE category_id = $1',
      [categoryId]
    );
    console.log('Cleared existing items\n');

    // Add all general surgery protocols
    for (const protocol of generalSurgeryProtocols) {
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
          [itemId, blockData.type, JSON.stringify({ text: blockData.text })]
        );
      }
    }

    console.log(`\n✓ Successfully restored ${generalSurgeryProtocols.length} GENERAL SURGERY protocols!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restoreGeneralSurgeryProtocols();
