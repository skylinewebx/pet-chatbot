/* Exploratory transcripts (eyeball check, no assertions): node tests/explore.js */
const CONFIG = require('../config.js');
const { Engine } = require('../chatbot.js');
const NOW = new Date(2026, 9, 1, 10, 0);
function run(title, turns) {
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
run('Pet only opener', ['I have a golden retriever', 'Hyderabad', 'Max', '2', 'nail trim and ear cleaning', 'first time']);
run('Greeting & smalltalk', ['hello', 'thanks', 'ok', 'bye']);
run('Different services per pet', ['book for my dog Bruno and my cat Luna', 'Bengaluru', 'beagle and persian', '3 and 5', 'full grooming for Bruno and a bath for Luna', 'no']);
run('Availability & earliest', ['do you have slots tomorrow?', 'earliest possible please, its for my cat']);
run('Evening + taken → yes', ['book a bath for my lab Coco, 3 yrs, Bengaluru, first time', 'tomorrow evening', '5pm', 'yes']);
run('Farm', ['I need a farm visit for my 3 cows', 'Mysore', 'gir', 'Ganga, Yamuna and Kaveri', '4, 5 and 6', 'deworming and checkup', 'yes our regular vet', 'monday 10am', 'Ramesh', '9876512345']);
run('20 messages in one batch', [['hi', 'hello?', 'i want', 'to book', 'something', 'for my', 'dog', 'his name', 'is', 'Simba', 'he is', '4 years', 'old', 'indie', 'needs', 'a bath', 'tomorrow', 'at 12', 'thanks', 'im in Pune']]);
run('Change date w/o value, cancel', ['book a bath for my dog Rex, pug, 2 years, Bengaluru, first time, tomorrow 11am', 'I want to change the date', 'saturday', 'cancel the booking', 'no']);
run('Gibberish while asking pet name', ['book grooming for my cat', 'Bengaluru', 'persian', 'ksjdhfkj', 'Mochi']);
run('Off-topic while booking', ['book grooming for my cat', 'what is bitcoin price', 'Bengaluru']);
run('Questions combined with booking', ['How much is a full grooming for a shih tzu? Also, are you open on Saturday? I would like to book for Saturday morning for my shih tzu Daisy']);
run('Emergency mid-booking', ['book a bath for my dog', 'Bengaluru', 'my dog is having a seizure', 'no']);
run('Symptom then yes', ['my cat has been scratching a lot and seems itchy', 'yes', 'Pune']);
run('After booking → new question → bye', ['book a nail trim for my cat Kiki, siamese, 2 yrs, Bengaluru, first time, monday 11am, Im Jo, jo@gmail.com', 'Confirm', 'do you have parking?', 'no thanks', 'bye']);
run('Second booking reuses details', ['book a nail trim for my cat Kiki, siamese, 2 yrs, Bengaluru, first time, monday 11am, Im Jo, jo@gmail.com', 'Confirm', 'yes, also book a bath for my dog Rolo', 'beagle', '4', 'no', 'tuesday 2pm']);
run('Staff names & pickup during booking', ['book a bath for my dog Rex, pug, 2 years, Bengaluru, first time', 'can you pick him up from home? and I want the same groomer as last time', 'friday 11am']);
run('Typos', ['hw much is a hiarcut for a pomerainan', 'wat r ur timngs', 'do u acept upi']);
