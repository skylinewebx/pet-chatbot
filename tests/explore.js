/* Exploratory transcripts (eyeball check, no assertions): node tests/explore.js [filter] */
const CONFIG = require('../config.js');
const { Engine } = require('../chatbot.js');
const NOW = new Date(2026, 9, 1, 10, 0);
const filter = process.argv[2];
function run(title, turns) {
  if (filter && !title.toLowerCase().includes(filter.toLowerCase())) return;
  const e = new Engine(CONFIG, { now: () => NOW });
  console.log('\n──── ' + title);
  turns.forEach(t => {
    const msg = Array.isArray(t) ? t.join('\n') : t;
    console.log('👤 ' + msg.replace(/\n/g, ' ⏎ '));
    const out = e.handle(msg);
    if (!out.length) console.log('🤖 (silent)');
    out.forEach(m => {
      console.log('🤖 ' + m.text.replace(/\n/g, '\n   '));
      if (m.chips) console.log('   [' + m.chips.map(c => c.disabled ? '~' + c.label + '~' : c.label).join(' | ') + ']');
      if (m.card) console.log('   ▣ ' + m.card.pets.map(p => p.title + ' → ' + p.services.join(', ')).join(' ‖ ') + ' | ' + m.card.rows.map(r => r[1]).join(' | ') + ' | ' + m.card.total);
    });
  });
}
run('Quick replies in any order', ['Emergency?', 'Book a visit', 'yes', 'Services & prices?', 'Opening hours?', 'Location?', 'Home pickup?', 'Book an appointment']);
run('Full booking', ['I want to book an appointment', 'dog', 'golden retriever', 'Bruno, 3', 'full grooming', 'no, first time', 'tomorrow', '5pm', 'yes please', 'Priya', 'both', '5125550199', 'priya@gmail.com', 'Confirm', 'thanks', 'bye']);
run('One-word answers', ['karachi', 'dog', 'karachi', 'labrador', 'tomorrow', 'Max 4', 'bath', 'no']);
run('Services questions', ['tell me about your services', 'what do you offer', 'services?', 'what do you do', 'srvices', 'prices', 'how much is a bath for a lab', 'where are you', 'what are your hours', 'do you do home pickup']);
run('All in one', ["Hi, I'm Emma. My golden retriever Bruno is 3 and needs a full groom and nail trim. He's never been groomed. Can I come tomorrow at 11am? Please pick him up. My number is (512) 555-0177"]);
run('Two pets', ['I have a dog and a cat, both need a bath', 'labrador and persian', 'Bruno 3 and Luna 2', 'no', 'saturday 12pm', 'no thanks', 'Nisha', 'email', 'nisha@gmail.com', 'Confirm']);
run('Emergency then yes', ['my dog ate chocolate', 'yes', 'dog', 'beagle', 'Rex 2']);
run('Symptom then yes', ['my cat has been vomiting', 'yes', 'siamese', 'Kiki 4']);
run('Off-topic in booking', ['book appointment', 'what is bitcoin price', 'cat', 'asdkjh', 'persian']);
