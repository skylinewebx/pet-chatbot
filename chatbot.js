/*!
 * PawCare AI Assistant — chatbot.js
 * A free, key-less chatbot for pet clinics & groomers.
 *
 * Part 1: the conversation ENGINE (intent matching, extraction, validation, booking flow).
 * Part 2: the chat WIDGET (Shadow DOM UI, batching, animations, storage, .ics export).
 *
 * One-line embed on any website:
 *   <script src="https://YOUR-SITE/chatbot.js" data-name="Business Name"></script>
 * Optional attributes: data-city, data-phone, data-open="true", data-standalone="true".
 * URL parameters ?name=&city=&phone= override everything.
 */
(function (root) {
  'use strict';

  var IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
  var CURRENT_SCRIPT = IS_BROWSER ? document.currentScript : null;

  /* =====================================================================
   * PART 1 — ENGINE
   * ===================================================================== */

  var OUT_OF_SCOPE = "Sorry, I can't help with that. Feel free to ask me anything about {short}! 😊";
  var GIBBERISH = "Sorry, I didn't quite catch that. Could you rephrase?";
  var EMERGENCY_FIRST = 'Please take your pet to the nearest emergency vet right away.';
  var MEDICAL_FIRST = 'Our vet will guide you on that during your visit.';

  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var MON_CAP = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var DAY_CAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAY_ALIAS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  var MONTH_ALIAS = { jan: 0, january: 0, feb: 1, february: 1, febuary: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
  var NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, both: 2 };

  function toSet(str) { var o = {}; str.split(/\s+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }

  /* Everyday English words: never typo-corrected, never treated as names. */
  var COMMON = toSet('a an the and or but if then so to of in on at by for with from into onto about as is am are was were be been being do does did doing done have has had having i me my mine myself we us our ours you your yours he him his she her hers it its they them their this that these those there here what which who whom whose when where why how all any both each few more most other some such no nor not only own same than too very can will just should would could may might must shall also please hi hello hey okay ok yes yeah yep sure thanks thank im ive id ill youre hes shes theyre thats whats dont doesnt didnt cant cannot wont isnt arent wasnt lets get gets got want wants wanted need needs needed like likes know think tell say said go goes going went come comes coming came make made take takes took see look looking one two three four five new old little big good great nice well really much many still even already yet maybe now today tomorrow tonight soon later morning afternoon evening night time times day days week weeks month months year years thing things something anything nothing everything someone anyone people way lot bit kind sort again back next last first second best better around after before over under up down out off away yesterday right left help give use used try trying keep put fine bad sorry hmm oh ah lol wow cool love loves loved ago since while because cause though car cars bus joke jokes poem poems story song songs movie movies film game games weather news football cricket politics math code money bank job work school although till until per via am pm o clock also just only ever never always often sometimes usually here there where everywhere thanks bye goodbye cheers welcome alright awesome lovely perfect wonderful super nope nah yup ya whats hows wheres who what does is are was let tell show find call called name named names');

  /* Function words: a "name" may never contain these. */
  var STOP = toSet('a an the and or but if then so to of in on at by for with from into about as is am are was were be been do does did have has had i me my we us our you your he him his she her it its they them their this that these those there here what which who when where why how all any both no not only can will just should would could may might must please hi hello hey okay ok yes yeah yep sure thanks thank im ive id dont cant wont lets want need like know think tell say go come make take see look also too very really much many some more most get got bye nope nah');

  var NAMEY_CITIES = toSet('austin paris sydney boston london chicago madison jackson charlotte florence georgia savannah phoenix dallas brooklyn');
  var BAD_NAME = toSet('book booking appointment appt bath baths groom grooming groomer haircut nail nails trim spa checkup vaccine vaccines vaccination dog dogs cat cats puppy kitten pet pets bird rabbit phone email both number call text whatsapp mobile tomorrow today tonight monday tuesday wednesday thursday friday saturday sunday morning evening afternoon time date service services name cancel change edit confirm help price prices cost hours open closed slot visit clinic vet doctor emergency nothing none fine good great cool nice yes no ok okay thanks hello hey hi sure correct done');

  var SLANG = {
    tmrw: 'tomorrow', tmr: 'tomorrow', tmrow: 'tomorrow', tmorrow: 'tomorrow', tommorow: 'tomorrow', tomorow: 'tomorrow', tommorrow: 'tomorrow', tomoz: 'tomorrow', '2moro': 'tomorrow', '2morrow': 'tomorrow', '2mrw': 'tomorrow', tomm: 'tomorrow',
    '2day': 'today', tdy: 'today', '2nite': 'tonight', tonite: 'tonight',
    pls: 'please', plz: 'please', plzz: 'please', plss: 'please', pleez: 'please',
    u: 'you', ur: 'your', urs: 'yours', r: 'are', n: 'and', '&': 'and', w: 'with', wid: 'with',
    appt: 'appointment', appts: 'appointments', appnt: 'appointment', apmt: 'appointment', apt: 'appointment', appoint: 'appointment', appointmnt: 'appointment',
    eve: 'evening', evng: 'evening', evening: 'evening', mrng: 'morning', morn: 'morning', mornin: 'morning', aftn: 'afternoon', arvo: 'afternoon', noonish: 'noon',
    thx: 'thanks', thnx: 'thanks', thanx: 'thanks', tnx: 'thanks', ty: 'thanks', tysm: 'thanks', tq: 'thanks', thku: 'thanks', thnks: 'thanks',
    wanna: 'want to', gonna: 'going to', gotta: 'got to', lemme: 'let me', gimme: 'give me',
    b4: 'before', abt: 'about', hw: 'how', wat: 'what', wht: 'what', wen: 'when', whn: 'when', wer: 'where', cn: 'can', cud: 'could', shud: 'should', wud: 'would', coz: 'because', cuz: 'because', bcoz: 'because', bc: 'because',
    doggo: 'dog', doggy: 'dog', doggie: 'dog', pupper: 'puppy', puppie: 'puppy', kitteh: 'cat', kitty: 'cat', bunny: 'rabbit', bunnies: 'rabbits',
    hrs: 'hours', hr: 'hour', mins: 'minutes', min: 'minutes', info: 'information', num: 'number', ph: 'phone', mob: 'mobile', addr: 'address',
    nxt: 'next', wk: 'week', wknd: 'weekend', asap: 'soonest', rn: 'now',
    k: 'okay', kk: 'okay', okk: 'okay', okie: 'okay', okey: 'okay', yep: 'yes', yup: 'yes', yeah: 'yes', yea: 'yes', ye: 'yes', yess: 'yes', nope: 'no', nah: 'no', naa: 'no',
    idk: 'dont know', dunno: 'dont know', idc: 'dont care',
    vax: 'vaccination', vaxx: 'vaccination', vacc: 'vaccination', vaccine: 'vaccine', groomin: 'grooming', grooom: 'groom',
    yo: 'yo', yrs: 'years', yr: 'year', mths: 'months', mos: 'months', wks: 'weeks', bday: 'birthday', msg: 'message', convo: 'conversation', sec: 'second'
  };

  var KEYMASH = /(qwer|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm|jkl;|lkjh|poiu|mnbv|qazw|wsx)/;

  var KNOWN_CITIES = ['bengaluru', 'bangalore', 'mumbai', 'bombay', 'delhi', 'new delhi', 'pune', 'hyderabad', 'chennai', 'madras', 'kolkata', 'calcutta', 'ahmedabad', 'jaipur', 'lucknow', 'kochi', 'cochin', 'chandigarh', 'gurgaon', 'gurugram', 'noida', 'indore', 'bhopal', 'nagpur', 'surat', 'vadodara', 'baroda', 'coimbatore', 'mysore', 'mysuru', 'mangalore', 'mangaluru', 'goa', 'thane', 'navi mumbai', 'ghaziabad', 'faridabad', 'visakhapatnam', 'vizag', 'patna', 'ranchi', 'bhubaneswar', 'guwahati', 'dehradun', 'trivandrum', 'thiruvananthapuram', 'madurai', 'nashik', 'aurangabad', 'amritsar', 'ludhiana', 'kanpur', 'varanasi', 'agra', 'raipur', 'jodhpur', 'udaipur', 'shimla', 'hubli', 'belgaum', 'tirupati', 'vijayawada', 'warangal', 'salem', 'trichy', 'pondicherry', 'puducherry', 'whitefield', 'indiranagar', 'koramangala', 'jayanagar', 'hsr layout', 'electronic city', 'jp nagar', 'marathahalli', 'hebbal', 'yelahanka', 'malleshwaram', 'btm layout', 'banashankari', 'rajajinagar', 'andheri', 'bandra', 'powai', 'dadar', 'borivali', 'london', 'new york', 'dubai', 'singapore', 'toronto', 'sydney', 'melbourne', 'paris', 'berlin', 'los angeles', 'san francisco', 'chicago', 'boston', 'seattle', 'austin', 'manchester', 'birmingham', 'auckland', 'abu dhabi', 'doha', 'kathmandu', 'colombo', 'dhaka', 'karachi', 'lahore'];

  var RX = {
    injection: / (ignore|disregard|forget|override|bypass) (all |the |your |any |my |every |these |those )?(previous |prior |above |earlier |system |original |initial |old )?(instructions?|prompts?|rules|messages|context|directions|guidelines|programming|everything)| system prompt| you are now | act as (a|an|my) | pretend (to be|you are|youre)| jailbreak| developer mode| dan mode| reveal (your|the) | your (instructions|rules|prompt)| new instructions| roleplay| from now on you/,
    emergency: / (bleed\w* (heavily|a lot|badly|profusely|everywhere|nonstop|non stop|wont stop|will not stop|not stopping|so much|too much)|heavy bleeding|heavily bleeding|lots of blood|blood everywhere|so much blood|losing (a lot of )?blood|poisoned|poisoning|ate (some |a )?(rat poison|poison|chocolate|grapes|raisins|xylitol|bleach|antifreeze|insecticide|pesticide|pills|tablets|medicine|my medicine|rat bait)|swallowed (some |a )?(poison|pills|tablets|bleach|medicine|battery|batteries|chocolate)|(cant|cannot|can not|not|trouble|difficulty|struggling|hard time|problem|unable to|stopped|isnt|is not) breath\w*|not breathing|choking|gasping|blue gums|seizure\w*|convuls\w*|having (a )?fits?|fitting|hit by (a |an )?(car|bike|vehicle|truck|bus|scooter|auto|motorbike|lorry)|run over|ran over|collaps\w*|unconscious|fainted|passed out|unresponsive|not moving|wont wake|(swollen|bloated|swelling|hard|distended) (belly|stomach|abdomen|tummy)|(belly|stomach|abdomen|tummy) (is |looks |seems )?(swollen|bloated|hard|swelling|distended)|bloat|broken (leg|bone|paw)|heat ?stroke|snake ?bite|bitten by a snake|electrocuted|dying)( |$)/,
    medical: / (medicine|medicines|medication|medications|meds|tablet|tablets|pill|pills|dose|doses|dosage|dosing|mg|antibiotic\w*|paracetamol|crocin|ibuprofen|aspirin|painkiller\w*|pain killer\w*|ointment|eye drops|ear drops|syrup|supplement\w*|vitamin\w*|steroid\w*|allerg\w*|pregnan\w*|in heat|giving birth|gave birth|whelping|due to deliver|what (should|can) i give|can i give|should i give)( |$)/,
    symptom: / (vomit\w*|throwing up|threw up|puking|diarrh\w*|loose motion\w*|loose stool\w*|limp\w*|not eating|wont eat|stopped eating|off (his|her|its) food|letharg\w*|itch\w*|itchy|scratching (a lot|constantly|all the time|nonstop)|rash\w*|cough\w*|sneez\w*|lump\w*|swelling|infection\w*|discharge|blood in|fever|shaking|trembling|weakness|red eyes?|hair loss|bald patch\w*|wound\w*|sick|unwell|not well|feeling ill|in pain|hurting|hurts)( |$)/,
    thanks: / (thanks|thank you|thankyou|cheers|appreciate it|appreciated|much appreciated|grateful)( |$)/,
    bye: / (bye|byee|goodbye|good bye|see you|see ya|cya|ttyl|good night|goodnight|take care|have a good day|have a nice day)( |$)/,
    greet: /^ (hi+|hello+|helo|hey+|heya|hiya|namaste|good (morning|afternoon|evening)|greetings|yo|howdy)( |$)/,
    yes: /^ (yes|yeah|yep|yup|ya|sure|ok|okay|alright|please do|go ahead|sounds good|definitely|of course|yes please|why not|lets do it|do it|perfect|great|absolutely|correct|that works|works for me|fine)( |$)/,
    no: /^ (no|nope|nah|nothing|not really|thats all|that is all|thats it|all good|im good|i am good|nothing else|no more|not now|all set|im done|i am done|nevermind|never mind|no thanks|no thank you)( |$)/,
    confirmYes: /^ (yes|yeah|yep|yup|confirm|confirmed|correct|looks good|looks great|all good|perfect|book it|go ahead|thats right|that is right|right|ok|okay|sure|done|great|lovely|absolutely|sounds good|all correct|yes confirm|please confirm|confirm it|confirm booking|confirm the booking)( |$)/,
    edit: /^ (edit|no|nope|change|modify|wrong|incorrect|not right|wait)( |$)| (edit|change something|make a change|something is wrong|not correct)( |$)/,
    change: / (change|changed|update|edit|modify|switch|instead|actually|wrong|incorrect|correction|not right|i meant|sorry|make it|move it|rather|scratch that|oops|not a|no its|no it is|no hes|no shes)( |$)/,
    book: / (book|booking|appointment|appointments|schedule|reserve|reservation|slot|slots|bring (him|her|them|my|our|it)|come in)( |$)/,
    visit: /^ (book a visit|i want to visit|i would like to visit|id like to visit|want to visit|can i visit|could i visit|visit you|visit|visiting|come visit|come by|drop by|stop by|pop in|i want to come|can i come|can i come by|can i drop by)( (you|the clinic|your clinic|today|please))?( please)? $/,
    yesish: /^ (yes|yeah|yep|yup|ya|sure|ok|okay|alright|please|yes please|please do|definitely|of course|absolutely|i do|i would|that would be great|sounds good|why not|need it|yes i do)( |$)/,
    price: / (how much|price|prices|pricing|cost|costs|costing|rate|rates|charge|charges|fee|fees|dollars|bucks|expensive|cheap|affordable|quote|estimate|tariff)( |$)/,
    servicesList: / ((what|which) (services|treatments|grooming services)|services (do you|you) (offer|provide|have)|what (do|can) you (offer|provide|do)|what (else )?do you guys do|tell me (about|more about) (your |the )?(services|clinic|business|what you do|prices)|about your services|list (of )?(your )?services|your services|services list|rate card|price list|all (your )?prices|full list|menu|services and prices|services prices|what you offer|what services)( |$)|^ (prices?|services?|pricing|rates|price list|services (and|&) prices|service list)( please)? $/,
    duration: / (how long|how much time|duration|how many hours|how many minutes)( |$)/,
    avail: / (available|availability|free|any slots?|slots|space|openings?|room)( |$)/,
    staffNames: / ((who are|names? of|name of|list) (your |the |all )?(vets?|groomers?|doctors?|staff|team|stylists?)|(vets?|groomers?|doctors?|staff) names?)( |$)/,
    staffReq: / ((same|specific|particular|favourite|favorite|preferred|usual|regular) (vet|groomer|doctor|stylist|person|lady|guy)|(vet|groomer|doctor) (named|called))( |$)/,
    pickup: / (pick ?up|pick (him|her|them|it) up|home pickup|collect (him|her|them|my)|pickup and drop|drop off|doorstep)( |$)/,
    anxious: / (anxious|nervous|scared|afraid|fearful|timid|shy|stressed|panics|hates (being )?groom\w*|hates baths?)( |$)/,
    bites: / (bites|biting|bite|aggressive|snaps|snapping|growls|reactive)( |$)/,
    firstTime: / (first time|no history|no past visits?|none before|never before|no previous( visits?)?|no prior( visits?)?|never visited|not been before|never been|never groomed|never had|not been groomed|hasnt been|has not been|first ever|no not yet|not yet|never seen|first visit|new to)( |$)/,
    history: / (seen before|been seen|been before|groomed before|been groomed|visited before|last time|last visit|previous groomer|previously|before at|was groomed|had a bad experience|bad experience|used to go|went to|last month|last year|last week|weeks ago|months ago|years ago|another groomer|other groomer|another vet|other vet|our vet|his vet|her vet|regular vet)( |$)/,
    shortQ: /^ (hours|opening hours|timings?|open|location|address|where|services?|prices?|pricing|rates|price list|pickup|home pickup|emergency|parking|payment|contact|phone number|services prices)( please)? $/,
    qword: /^ (what|whats|how|hows|when|where|wheres|why|which|who|can|could|do|does|did|is|are|will|would|should|shall|may|any|is there|are there|tell me|explain|whether)( |$)/,
    earliest: / (earliest|soonest|first available|first free|next available|any day|anytime|any time|whenever|as soon as possible)( |$)/,
    notSure: /^ (not sure|dont know|do not know|no idea|unsure|unknown|dont remember|cant remember|im not sure|i am not sure|no clue|maybe)( |$)/
  };

  var OFFTOPIC = / (bitcoin|crypto|stock|stocks|shares|weather|president|prime minister|capital of|movie|movies|song|songs|lyrics|recipe|football|cricket|election|joke|jokes|poem|story|code|coding|programming|homework|math|news|politics|celebrity|game|games)( |$)/;
  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
  var EMAIL_ANY_G = /[^\s@<>()"',;:]*@[^\s@<>()"',;:]*/g;
  var EMAIL_TYPOS = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gnail.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com' };

  /* ---------- tiny helpers ---------- */
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function titleCase(s) { return String(s).toLowerCase().replace(/(^|[\s-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function joinList(arr, word) {
    word = word || 'and';
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return arr[0] + ' ' + word + ' ' + arr[1];
    return arr.slice(0, -1).join(', ') + ' ' + word + ' ' + arr[arr.length - 1];
  }
  function sentences(t) { return (String(t).match(/[.!?](\s|$)/g) || []).length; }
  /* Keep only the actual question: "We're open …. Which day?" → "Which day?" */
  function shortQ(p) {
    var bits = String(p).match(/[^.!?]+[.!?]+/g) || [p];
    var q = bits.filter(function (b) { return /\?\s*$/.test(b); })[0] || bits[bits.length - 1];
    return q.trim();
  }
  function art(w) { return /^[aeiou]/i.test(w) ? 'an' : 'a'; }
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
  function hm(str) { var p = str.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fmtTime(min) {
    var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12;
    return hh + ':' + pad(m) + ' ' + ap;
  }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function fmtDate(d) { return DAY_CAP[d.getDay()] + ', ' + MON_CAP[d.getMonth()] + ' ' + d.getDate(); }
  function fmtDateLong(d) { return cap(DAY_NAMES[d.getDay()]) + ', ' + cap(MONTHS[d.getMonth()]) + ' ' + d.getDate(); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* Damerau (OSA) distance with an early exit. */
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) { d[0][j] = j; }
    for (i = 1; i <= a.length; i++) {
      var rowMin = Infinity;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < rowMin) rowMin = d[i][j];
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }

  /* Lowercase + strip punctuation, keeping digits like 3:30, 05/10, 2026-10-05 intact. */
  function baseClean(raw) {
    var s = ' ' + String(raw).toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(EMAIL_ANY_G, ' ')
      .replace(/https?:\/\/\S+/g, ' ') + ' ';
    s = s.replace(/\b(he|she|it|that|what|who|there|here|let|where|how)'s\b/g, '$1s');
    s = s.replace(/([a-z])'s\b/g, '$1');                  // possessive: bruno's → bruno
    s = s.replace(/[^a-z0-9:\/.\-'\s]/g, ' ');
    s = s.replace(/'/g, '');
    s = s.replace(/[.:\/\-]/g, function (m, off, str) {
      return (/\d/.test(str.charAt(off - 1)) && /\d/.test(str.charAt(off + 1))) ? m : ' ';
    });
    return s.replace(/\s+/g, ' ');
  }

  var PHRASE_FIXES = [
    [/ check up /g, ' checkup '], [/ check ups /g, ' checkups '], [/ hair cut /g, ' haircut '], [/ de shed/g, ' deshed'],
    [/ e mail /g, ' email '], [/ a m /g, ' am '], [/ p m /g, ' pm '], [/ (\d{1,2}) ?a\.?m /g, ' $1am '], [/ (\d{1,2}) ?p\.?m /g, ' $1pm '],
    [/ (\d{1,2})(am|pm) /g, ' $1 $2 '], [/ (\d{1,2}:\d{2})(am|pm) /g, ' $1 $2 '], [/ (\d{1,2}\.\d{2})(am|pm) /g, ' $1 $2 '],
    [/ y o /g, ' yo '], [/ guineapig/g, ' guinea pig'], [/ walkin /g, ' walk in '], [/ pick up /g, ' pickup '], [/ ok ok /g, ' okay '],
    [/ day after tmrw /g, ' day after tomorrow '], [/^ were (are|is) /g, ' where $1 '], [/ shihtzu /g, ' shih tzu ']
  ];

  /* =====================================================================
   * Engine constructor
   * ===================================================================== */
  function Engine(cfg, opts) {
    opts = opts || {};
    this.cfg = cfg;
    this.biz = cfg.business;
    this.nowFn = opts.now || function () { return new Date(); };
    this.rng = opts.rng || Math.random;
    this.takenProvider = opts.takenProvider || null;
    this.svc = {};
    var self = this;
    cfg.services.forEach(function (s) { self.svc[s.id] = s; });
    this.vars = {
      name: this.biz.name, short: this.biz.shortName || this.biz.name, city: this.biz.city,
      address: this.biz.street + ', ' + this.biz.city, phone: this.biz.phone, emergency: this.biz.emergencyPhone,
      email: this.biz.email, hours: this.biz.hoursText
    };
    this.openMin = hm(this.biz.openTime);
    this.lastMin = hm(this.biz.lastSlot);
    this.step = this.biz.slotMinutes || 30;
    this.buildIndexes();
    this.reset();
  }

  Engine.prototype.reset = function () {
    this.state = {
      stage: 'chat', b: this.freshBooking(), err: {}, lastErr: {}, lastPick: {}, pendingOffer: null,
      profile: null, bookings: [], lastBooking: null, ctaShown: false
    };
  };
  Engine.prototype.freshBooking = function () {
    return { active: false, pets: [], city: null, date: null, time: null, pendingTime: null, timePref: null, ownerName: null, contact: null, phone: null, email: null, history: null, notes: [], staff: null, pickup: null, told: false, summaryShown: false };
  };
  Engine.prototype.serialize = function () { return JSON.parse(JSON.stringify(this.state)); };
  Engine.prototype.restore = function (st) { if (st && st.b) this.state = st; };

  /* ---------- indexes: vocabulary, breeds, pet words, Q&A regexes ---------- */
  Engine.prototype.buildIndexes = function () {
    var self = this, cfg = this.cfg, vocab = {};
    function addWords(phrase) {
      String(phrase).toLowerCase().replace(/\*/g, '').split(/[^a-z]+/).forEach(function (w) {
        if (w.length >= 3) { vocab[w] = 1; }
      });
    }
    function addStem(kw) {
      if (/\*$/.test(kw)) {
        var stem = kw.replace(/\*$/, '').split(' ').pop();
        if (stem.length >= 4) ['', 's', 'ing', 'ed', 'er', 'ers', 'es'].forEach(function (suf) { vocab[stem + suf] = 1; });
        else vocab[stem] = 1;
      }
    }
    // Q&A
    this.qa = cfg.qa.map(function (e) {
      var groups = e.req.map(function (g) { return g.map(function (kw) { addWords(kw); addStem(kw); return self.compileKw(kw); }); });
      var bonus = (e.k || []).map(function (kw) { addWords(kw); addStem(kw); return self.compileKw(kw); });
      return { e: e, groups: groups, bonus: bonus };
    });
    // services
    this.svcKw = cfg.services.map(function (s) {
      return { id: s.id, res: s.kw.map(function (kw) { addWords(kw); return self.compileKw(kw); }) };
    });
    // pets
    this.petWords = [];
    cfg.pets.forEach(function (p) {
      p.words.forEach(function (w) { addWords(w); self.petWords.push({ w: w, pet: p, re: new RegExp(' ' + esc(w) + '(?= )') }); });
    });
    this.petWords.sort(function (a, b) { return b.w.length - a.w.length; });
    this.petById = {};
    cfg.pets.forEach(function (p) { self.petById[p.id] = p; });
    // breeds
    var AMBIG = toSet('dutch rex american teddy dwarf jersey gir syrian arabian campbell silkie texel mustang golden boxer marwari tabby calico chow cocker aussie shiba retriever basset spitz desi indie lab pom dutch american ram');
    var ALIAS = { gsd: 'German Shepherd', alsatian: 'German Shepherd', lab: 'Labrador', labrador: 'Labrador', 'labrador retriever': 'Labrador', golden: 'Golden Retriever', retriever: 'Retriever', pom: 'Pomeranian', rottie: 'Rottweiler', frenchie: 'French Bulldog', aussie: 'Australian Shepherd', shihtzu: 'Shih Tzu', 'shih-tzu': 'Shih Tzu', yorkie: 'Yorkshire Terrier', westie: 'West Highland Terrier', staffy: 'Staffordshire Terrier', desi: 'Indie', 'indian pariah': 'Indie', pariah: 'Indie', 'min pin': 'Miniature Pinscher', cocker: 'Cocker Spaniel', chow: 'Chow Chow', shiba: 'Shiba Inu', dobermann: 'Doberman', 'st bernard': 'Saint Bernard', budgerigar: 'Budgie' };
    this.breeds = [];
    Object.keys(cfg.breeds).forEach(function (type) {
      var bySize = cfg.breeds[type];
      Object.keys(bySize).forEach(function (size) {
        bySize[size].forEach(function (ph) {
          addWords(ph);
          var clean = baseClean(ph).trim();
          self.breeds.push({ phrase: clean, type: type, size: (type === 'dog' || type === 'cat') ? size : 's', display: ALIAS[ph] || titleCase(ph), ambig: !!AMBIG[clean], re: new RegExp(' ' + esc(clean) + '(?:s)?(?= )') });
        });
      });
    });
    this.breeds.sort(function (a, b) { return b.phrase.length - a.phrase.length; });
    // date / intent words
    MONTHS.concat(DAY_NAMES).forEach(function (w) { vocab[w] = 1; });
    ('appointment appointments booking book tomorrow today tonight morning afternoon evening emergency breathing bleeding seizure poison poisoned collapsed swollen belly stomach price prices cost cancel change confirm phone email number grooming groomer vaccination available slot slots reschedule hello thanks please veterinarian vet clinic address hours schedule weekend service services checkup haircut nails bath spa puppy kitten pickup parking payment open closed sunday saturday monday information emergency vomiting diarrhea limping medicine allergy allergic pregnant urgent anxious nervous aggressive biting senior shedding matted fleas ticks teeth dental microchip deworming neuter spay vaccine vaccines vaccinated groomed groomers').split(' ').forEach(function (w) { vocab[w] = 1; });
    ('choking choke gasping breathing breathe poison poisoned poisoning collapsed collapse unconscious fainted bleeding bleed blood seizure seizures seizing convulsing convulsions swollen bloated bloat vomiting vomit diarrhea limping injured injury accident emergency urgent dying edit confirm cancel karachi lahore located location where were weather president').split(' ').forEach(function (w) { vocab[w] = 1; });
    this.vocab = vocab;
    this.vocabList = Object.keys(vocab).filter(function (w) { return w.length >= 4; });
    this.cities = KNOWN_CITIES.slice();
    var c = String(this.biz.city || '').toLowerCase();
    if (c && this.cities.indexOf(c) < 0) this.cities.push(c);
    this.cities.sort(function (a, b) { return b.length - a.length; });
    this.typoCache = {};
  };

  Engine.prototype.compileKw = function (kw) {
    var prefix = /\*$/.test(kw);
    var k = this.phraseFix(this.slang(baseClean(kw.replace(/\*$/, '')))).trim();
    var words = k.split(' ').length;
    var re = new RegExp(' ' + esc(k) + (prefix ? '[a-z]*' : '(?:s|es)?') + '(?= )');
    return { re: re, w: words };
  };

  Engine.prototype.slang = function (s) {
    return (' ' + s.trim().split(' ').map(function (t) { return Object.prototype.hasOwnProperty.call(SLANG, t) ? SLANG[t] : t; }).join(' ') + ' ').replace(/\s+/g, ' ');
  };
  Engine.prototype.phraseFix = function (s) {
    PHRASE_FIXES.forEach(function (f) { s = s.replace(f[0], f[1]); s = s.replace(f[0], f[1]); });
    return s;
  };
  Engine.prototype.isKnownWord = function (t) {
    return !!(COMMON[t] || this.vocab[t] || Object.prototype.hasOwnProperty.call(SLANG, t) || NUM_WORDS[t] || DAY_ALIAS[t] !== undefined || MONTH_ALIAS[t] !== undefined || /\d/.test(t) || this.cities.indexOf(t) >= 0);
  };
  Engine.prototype.correct = function (t) {
    if (t.length < 4 || /[^a-z]/.test(t) || this.isKnownWord(t)) return t;
    if (this.typoCache[t] !== undefined) return this.typoCache[t];
    var max = t.length >= 7 ? 2 : 1, best = null, bestD = max + 1;
    for (var i = 0; i < this.vocabList.length; i++) {
      var v = this.vocabList[i];
      if (Math.abs(v.length - t.length) > max) continue;
      if (v.charAt(0) !== t.charAt(0) && t.length < 6) continue;
      if (t.length === 4 && t.split('').sort().join('') !== v.split('').sort().join('')) continue;
      var d = dist(t, v, max);
      if (d < bestD) { bestD = d; best = v; if (d === 1 && max === 1) break; }
    }
    var out = bestD <= max ? best : t;
    this.typoCache[t] = out;
    return out;
  };
  /* Full normalisation for matching: clean → slang → phrase fixes → typo correction. */
  Engine.prototype.norm = function (raw) {
    var self = this;
    var s = this.phraseFix(this.slang(baseClean(raw)));
    // Capitalised words after the first word are probably names ("my cat Mittens"): never autocorrect them.
    var keep = {};
    (String(raw).match(/[^\s.!?]\s+[A-Z][a-z]{2,}/g) || []).forEach(function (m) { keep[m.replace(/^.\s+/, '').toLowerCase()] = 1; });
    s = ' ' + s.trim().split(' ').map(function (t) { return keep[t] ? t : self.correct(t); }).join(' ') + ' ';
    return this.phraseFix(this.slang(s));
  };

  Engine.prototype.fill = function (str) {
    var self = this;
    return String(str).replace(/\{price:(\w+)\}/g, function (m, id) { return self.priceRange(id); })
      .replace(/\{(\w+)\}/g, function (m, k) { return self.vars[k] != null ? self.vars[k] : m; });
  };
  Engine.prototype.pick = function (key, arr) {
    if (arr.length === 1) return arr[0];
    var last = this.state.lastPick[key], i, tries = 0;
    do { i = Math.floor(this.rng() * arr.length); tries++; } while (i === last && tries < 10);
    this.state.lastPick[key] = i;
    return arr[i];
  };
  Engine.prototype.msg = function (text, extra) {
    var m = { text: this.fill(text) };
    if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; });
    return m;
  };

  /* ---------- prices ---------- */
  Engine.prototype.priceRange = function (id) {
    var s = this.svc[id]; if (!s) return '';
    if (s.onRequest) return 'from ' + money(s.from) + ' plus travel';
    if (s.flat) return money(s.flat);
    return 'from ' + money(s.prices[0]) + (s.perUnit ? ' ' + s.perUnit : '');
  };
  Engine.prototype.svcPrice = function (id, size) {
    var s = this.svc[id];
    if (s.onRequest) return { lo: s.from, hi: null, text: 'on request, from ' + money(s.from) + ' plus travel' };
    if (s.flat) return { lo: s.flat, hi: s.flat, text: money(s.flat) };
    var idx = { s: 0, m: 1, l: 2 }[size];
    if (idx !== undefined) return { lo: s.prices[idx], hi: s.prices[idx], text: money(s.prices[idx]) + (s.perUnit ? ' ' + s.perUnit : '') };
    return { lo: s.prices[0], hi: s.prices[2], text: 'from ' + money(s.prices[0]) + (s.perUnit ? ' ' + s.perUnit : '') };
  };
  Engine.prototype.petSize = function (p) {
    if (!p) return null;
    var grp = (this.petById[p.type] || {}).group;
    if (grp === 'farm') return 'farm';
    if (p.size) return p.size;
    if (p.type !== 'dog') return 's';
    return null;
  };
  var SIZE_WORD = { s: 'small', m: 'medium', l: 'large' };

  /* ---------- calendar & slots ---------- */
  Engine.prototype.today = function () { var n = this.nowFn(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  Engine.prototype.nowMin = function () { var n = this.nowFn(); return n.getHours() * 60 + n.getMinutes(); };
  Engine.prototype.isOpenDay = function (d) { return this.biz.openDays.indexOf(d.getDay()) >= 0; };
  Engine.prototype.allSlots = function () { var a = []; for (var m = this.openMin; m <= this.lastMin; m += this.step) a.push(m); return a; };
  Engine.prototype.isTaken = function (iso, min) {
    if (this.takenProvider) { var t = this.takenProvider(iso) || []; if (t.indexOf(min) >= 0) return true; }
    for (var i = 0; i < this.state.bookings.length; i++) { var bk = this.state.bookings[i]; if (bk.dateISO === iso && bk.timeMin === min) return true; }
    return (hash(iso + '|' + min) % 100) < 30;
  };
  Engine.prototype.slotStatus = function (iso) {
    var self = this, isToday = iso === isoOf(this.today()), cutoff = this.nowMin() + (this.biz.minLeadMinutes || 60);
    return this.allSlots().filter(function (m) { return !(isToday && m < cutoff); }).map(function (m) { return { min: m, taken: self.isTaken(iso, m) }; });
  };
  Engine.prototype.freeSlots = function (iso) { return this.slotStatus(iso).filter(function (s) { return !s.taken; }).map(function (s) { return s.min; }); };
  Engine.prototype.nearestFree = function (iso, min, n) {
    var free = this.freeSlots(iso).filter(function (m) { return m !== min; });
    free.sort(function (a, b) { return Math.abs(a - min) - Math.abs(b - min) || a - b; });
    return free.slice(0, n || 2).sort(function (a, b) { return a - b; });
  };
  Engine.prototype.openDaysAhead = function (count, from) {
    var out = [], d = from || this.today();
    for (var i = 0; i < 60 && out.length < count; i++) {
      var x = addDays(d, i);
      if (this.isOpenDay(x) && this.freeSlots(isoOf(x)).length) out.push(x);
    }
    return out;
  };
  Engine.prototype.earliestSlot = function () {
    var days = this.openDaysAhead(1);
    if (!days.length) return null;
    var iso = isoOf(days[0]);
    return { iso: iso, min: this.freeSlots(iso)[0] };
  };
  Engine.prototype.relDay = function (iso) {
    var t = this.today(), d = fromIso(iso);
    if (iso === isoOf(t)) return 'today';
    if (iso === isoOf(addDays(t, 1))) return 'tomorrow';
    return fmtDate(d);
  };
  Engine.prototype.whenText = function (iso) {
    var r = this.relDay(iso);
    return (r === 'today' || r === 'tomorrow') ? r + ' (' + fmtDate(fromIso(iso)) + ')' : 'on ' + r;
  };
  Engine.prototype.dateChips = function () {
    var t = this.today(), self = this;
    return this.openDaysAhead(5).map(function (d) {
      var iso = isoOf(d);
      var label = iso === isoOf(t) ? 'Today' : iso === isoOf(addDays(t, 1)) ? 'Tomorrow' : fmtDate(d);
      return { label: label, value: label === 'Today' || label === 'Tomorrow' ? label : fmtDate(d) };
    });
  };
  Engine.prototype.timeChips = function (iso, pref) {
    var st = this.slotStatus(iso);
    var ranges = { morning: [0, 719], afternoon: [720, 959], evening: [960, 1439] };
    if (pref && ranges[pref]) {
      var r = ranges[pref];
      var sub = st.filter(function (s) { return s.min >= r[0] && s.min <= r[1]; });
      if (sub.some(function (s) { return !s.taken; })) st = sub;
    } else {
      st = st.filter(function (s) { return s.min % 60 === 0; });
      if (!st.some(function (s) { return !s.taken; })) st = this.slotStatus(iso);
    }
    return st.map(function (s) { return { label: fmtTime(s.min), value: fmtTime(s.min), disabled: s.taken, note: s.taken ? 'Booked' : '' }; });
  };

  /* ---------- date parsing & validation ---------- */
  Engine.prototype.parseDate = function (M) {
    var t = this.today(), m;
    if (/ 24\/7 /.test(M)) M = M.replace(/ 24\/7 /g, ' ');
    if ((m = M.match(/ (\d{4})-(\d{1,2})-(\d{1,2}) /))) return this.mkDate(+m[1], +m[2] - 1, +m[3], true);
    if ((m = M.match(/ (\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))? /)) || (m = M.match(/ (\d{1,2})[-.](\d{1,2})[-.](\d{2,4}) /))) {
      var y = m[3] ? (m[3].length === 2 ? 2000 + (+m[3]) : +m[3]) : null;
      return this.mkDate(y, +m[2] - 1, +m[1], !!m[3]);
    }
    var MON = '(jan|january|feb|february|febuary|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)';
    if ((m = M.match(new RegExp(' (\\d{1,2})(?:st|nd|rd|th)? (?:of )?' + MON + '(?: (\\d{4}))?(?= )')))) return this.mkDate(m[3] ? +m[3] : null, MONTH_ALIAS[m[2]], +m[1], !!m[3]);
    if ((m = M.match(new RegExp(' ' + MON + ' (\\d{1,2})(?:st|nd|rd|th)?(?: (\\d{4}))?(?= )')))) return this.mkDate(m[3] ? +m[3] : null, MONTH_ALIAS[m[1]], +m[2], !!m[3]);
    if (/ (day after tomorrow|overmorrow) /.test(M)) return this.checkDate(addDays(t, 2));
    if (/ (today|tonight|this evening|this afternoon|this morning|later today) /.test(M)) return this.checkDate(t);
    if (/ tomorrow /.test(M)) return this.checkDate(addDays(t, 1));
    if ((m = M.match(/ in (\d+|a|one|two|three|four|five|six|seven|ten|couple of) (day|days|week|weeks)(?= )/))) {
      var n = /^\d+$/.test(m[1]) ? +m[1] : (NUM_WORDS[m[1]] || (m[1] === 'couple of' ? 2 : 1));
      return this.checkDate(addDays(t, /week/.test(m[2]) ? n * 7 : n));
    }
    if ((m = M.match(/ (this |next |coming |on |upcoming )?(monday|mon|tuesday|tue|tues|wednesday|wed|weds|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)(?= )/))) {
      var target = DAY_ALIAS[m[2]], diff = (target - t.getDay() + 7) % 7;
      if (diff === 0 && m[1] && /next/.test(m[1])) diff = 7;
      return this.checkDate(addDays(t, diff));
    }
    if (/ (this )?weekend /.test(M)) { var dd = (6 - t.getDay() + 7) % 7; return this.checkDate(addDays(t, dd)); }
    if ((m = M.match(/ (?:on )?the (\d{1,2})(?:st|nd|rd|th)(?= )/)) || (m = M.match(/ on (\d{1,2})(?:st|nd|rd|th)(?= )/))) {
      var day = +m[1], mo = t.getMonth(), yr = t.getFullYear();
      if (day < t.getDate()) { mo++; if (mo > 11) { mo = 0; yr++; } }
      return this.mkDate(yr, mo, day, true);
    }
    if (RX.earliest.test(M)) { var e = this.earliestSlot(); return e ? { iso: e.iso, earliest: true } : null; }
    return null;
  };
  Engine.prototype.mkDate = function (y, mo, d, yearGiven) {
    var t = this.today();
    if (mo === undefined || mo < 0 || mo > 11) return { err: 'unclear' };
    if (y == null) y = t.getFullYear();
    var dim = daysInMonth(y, mo);
    if (d < 1 || d > dim) return { err: 'impossible', month: cap(MONTHS[mo]), dim: dim, day: d };
    var date = new Date(y, mo, d);
    if (!yearGiven && date < t && (t - date) / 864e5 > 60) {
      if (d > daysInMonth(y + 1, mo)) return { err: 'impossible', month: cap(MONTHS[mo]), dim: daysInMonth(y + 1, mo), day: d };
      date = new Date(y + 1, mo, d);
    }
    return this.checkDate(date);
  };
  Engine.prototype.checkDate = function (date) {
    var t = this.today(), iso = isoOf(date);
    if (date < t) return { err: 'past', iso: iso };
    if ((date - t) / 864e5 > (this.biz.bookingWindowDays || 90)) return { err: 'toofar', iso: iso };
    if (!this.isOpenDay(date)) return { err: 'closed', iso: iso };
    if (!this.freeSlots(iso).length) return { err: iso === isoOf(t) ? 'todayDone' : 'full', iso: iso };
    return { iso: iso };
  };

  /* ---------- time parsing ---------- */
  Engine.prototype.parseTime = function (M, pending) {
    var m, h = null, mi = 0, ap = null, pref = null;
    if (/ (in the )?morning /.test(M)) pref = 'morning';
    else if (/ (afternoon|after lunch|lunchtime|lunch time) /.test(M)) pref = 'afternoon';
    else if (/ (evening|tonight|after work|this evening) /.test(M)) pref = 'evening';
    if (/ (noon|midday) /.test(M)) { h = 12; }
    else if ((m = M.match(/ (\d{1,2})[:.](\d{2}) ?(am|pm)?(?= )/))) { h = +m[1]; mi = +m[2]; ap = m[3] || null; }
    else if ((m = M.match(/ (\d{1,2}) ?(am|pm)(?= )/))) { h = +m[1]; ap = m[2]; }
    else if ((m = M.match(/ (\d{1,2}) ?o ?clock(?= )/))) { h = +m[1]; }
    else if ((m = M.match(/ half past (\d{1,2})(?= )/))) { h = +m[1]; mi = 30; }
    else if ((m = M.match(/ (?:at|around|by|after|about|before) (\d{1,2})(?= )(?! (years?|yrs?|year|months?|month|kg|kgs|kilos?|days?|weeks?|dogs?|cats?|pets?|yo|mins?|minutes?|hours?|hrs?|of)\b)/))) { h = +m[1]; }
    else if (pending && (m = M.match(/^ (\d{1,2}) $/))) { h = +m[1]; }
    if (h === null) return pref ? { pref: pref } : null;
    if (h > 23 || mi > 59) return { err: 'unclear' };
    if (ap === 'pm' && h < 12) h += 12;
    else if (ap === 'am' && h === 12) h = 0;
    else if (!ap) {
      if ((pref === 'evening' || pref === 'afternoon') && h < 12) h += 12;
      else if (h >= 1 && h <= 8) h += 12;
    }
    return { min: h * 60 + mi, pref: pref };
  };
  Engine.prototype.checkTime = function (iso, min) {
    if (min % this.step !== 0) {
      var lo = min - (min % this.step), hi = lo + this.step;
      return { err: 'offgrid', near: [lo, hi].filter(function (x) { return x >= this.openMin && x <= this.lastMin; }, this) };
    }
    if (min < this.openMin || min > this.lastMin) return { err: 'outside' };
    if (iso === isoOf(this.today()) && min < this.nowMin() + (this.biz.minLeadMinutes || 60)) return { err: 'past', near: this.freeSlots(iso).slice(0, 2) };
    if (this.isTaken(iso, min)) return { err: 'taken', near: this.nearestFree(iso, min, 2) };
    return { ok: true };
  };

  /* ---------- phone & email ---------- */
  Engine.prototype.findPhones = function (R) {
    var out = [], re = /(\+?\(?\d[\d\s().-]{3,}\d)/g, m;
    while ((m = re.exec(R))) {
      var raw = m[1].trim();
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw) || /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(raw)) continue;
      if (/^\d{1,2}[:.]\d{2}$/.test(raw)) continue;
      var digits = raw.replace(/\D/g, '');
      if (digits.length < 5) continue;
      out.push({ raw: raw, digits: digits, plus: /^\+/.test(raw) });
    }
    return out;
  };
  Engine.prototype.validPhone = function (p) {
    var d = p.digits;
    if (/^(\d)\1+$/.test(d) || d === '1234567890' || d === '0123456789') return null;
    function us(x) { return '(' + x.slice(0, 3) + ') ' + x.slice(3, 6) + '-' + x.slice(6); }
    if (p.plus) {
      if (/^1/.test(d)) return /^1[2-9]\d{2}[2-9]\d{6}$/.test(d) ? us(d.slice(1)) : null;
      return (d.length >= 8 && d.length <= 15) ? '+' + d : null;
    }
    if (/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return us(d);            // US / Canada 10 digits
    if (/^1[2-9]\d{2}[2-9]\d{6}$/.test(d)) return us(d.slice(1));  // with leading 1
    return null;
  };
  Engine.prototype.findEmails = function (R, pending) {
    var out = [], m, re = new RegExp(EMAIL_ANY_G.source, 'g');
    while ((m = re.exec(R))) { var e = m[0].replace(/[.,!?]+$/, ''); if (e.length > 1 && /@/.test(e)) out.push(e); }
    if (!out.length && pending) {
      var at = R.toLowerCase().match(/([a-z0-9._%+-]+)\s+at\s+([a-z0-9-]+)\s+dot\s+([a-z.]{2,})/);
      if (at) out.push(at[1] + '@' + at[2] + '.' + at[3].replace(/\s+dot\s+/g, '.'));
    }
    return out;
  };
  Engine.prototype.checkEmail = function (e) {
    var low = e.toLowerCase();
    if (!EMAIL_RE.test(low) || low.match(EMAIL_RE)[0] !== low || /\.\./.test(low) || /^\./.test(low)) return { err: 'invalid' };
    var dom = low.split('@')[1];
    if (EMAIL_TYPOS[dom]) return { err: 'typo', suggestion: low.split('@')[0] + '@' + EMAIL_TYPOS[dom] };
    return { ok: low };
  };

  /* ---------- names, cities, breeds, pets, ages, services ---------- */
  Engine.prototype.nameOk = function (txt, strict) {
    var t = String(txt).trim().replace(/[.!,]+$/, '').replace(/\s+/g, ' ');
    if (t.length < 2 || t.length > 40) return null;
    var words = t.split(' ');
    if (words.length > 4) return null;
    for (var i = 0; i < words.length; i++) {
      var w = words[i], lw = w.toLowerCase().replace(/[^a-z]/g, '');
      if (!/^[A-Za-z][A-Za-z.'-]*$/.test(w)) return null;
      if (STOP[lw] || BAD_NAME[lw]) return null;
      if (this.cities.indexOf(lw) >= 0 && !NAMEY_CITIES[lw]) return null;
      if (strict && (COMMON[lw] || this.vocab[lw])) return null;
      if (KEYMASH.test(lw) || /[bcdfghjklmnpqrstvwxz]{5,}/.test(lw) || (lw.length > 3 && !/[aeiouy]/.test(lw)) || /(.)\1{2,}/.test(lw)) return null;
      if (this.isServiceWord(lw) || this.isPetWord(lw)) return null;
    }
    return words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
  };
  Engine.prototype.isServiceWord = function (w) {
    for (var i = 0; i < this.svcKw.length; i++) for (var j = 0; j < this.svcKw[i].res.length; j++) if (this.svcKw[i].res[j].re.test(' ' + w + ' ')) return true;
    return false;
  };
  Engine.prototype.isPetWord = function (w) {
    for (var i = 0; i < this.petWords.length; i++) if (this.petWords[i].w === w) return true;
    return false;
  };
  Engine.prototype.firstChunk = function (raw) {
    return String(raw).split(/[,.;!?\n]| and | but | - /i)[0].trim();
  };
  Engine.prototype.findCity = function (R, M, pending) {
    for (var i = 0; i < this.cities.length; i++) {
      if (M.indexOf(' ' + this.cities[i] + ' ') >= 0) return titleCase(this.cities[i]);
    }
    var m = R.match(/\b(?:i live in|i stay in|i'm in|im in|i am in|based in|located in|staying in|living in|i'm from|im from|i am from|coming from|we're in|we are in|we live in)\s+([A-Za-z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/i);
    if (m) {
      var c = m[1].trim(), lw = c.toLowerCase().split(' ')[0];
      if (!STOP[lw] && !COMMON[lw] && !this.vocab[lw] && DAY_ALIAS[lw] === undefined && MONTH_ALIAS[lw] === undefined) return titleCase(c);
    }
    if (pending) {
      var chunk = this.firstChunk(R).replace(/^(i live in|i stay in|i'm in|im in|i am in|in|near|at|from|it's|its|it is|we're in|we are in|based in|i'm from|im from|i am from)\s+/i, '');
      var words = chunk.split(/\s+/);
      if (words.length >= 1 && words.length <= 4 && /^[A-Za-z][A-Za-z\s'-]*$/.test(chunk)) {
        var okw = words.every(function (w) { var l = w.toLowerCase(); return !STOP[l] || l === 'the'; });
        if (okw && !this.gibberish(this.norm(chunk))) return titleCase(chunk);
      }
    }
    return null;
  };
  Engine.prototype.findBreeds = function (M, pending) {
    var out = [], mask = M;
    for (var i = 0; i < this.breeds.length; i++) {
      var br = this.breeds[i], m = mask.match(br.re);
      if (!m) continue;
      var idx = m.index;
      if (br.ambig && !pending) {
        var before = mask.slice(Math.max(0, idx - 14), idx), after = mask.slice(idx + m[0].length, idx + m[0].length + 14);
        if (!/ (my|our|a|an|is|hes|shes|its|his|her)\s*$/.test(before) && !/^ (dog|cat|puppy|pup|kitten|mix|cross|breed|retriever)\b/.test(after)) continue;
      }
      if (br.phrase === 'golden' && / golden retriever/.test(M)) continue;
      out.push({ type: br.type, size: br.size, display: br.display, idx: idx });
      mask = mask.slice(0, idx) + ' ' + Array(m[0].length).join('_') + mask.slice(idx + m[0].length);
    }
    out.sort(function (a, b) { return a.idx - b.idx; });
    return out;
  };
  /* Pets mentioned with a determiner ("my dog", "2 cats", "a lab and a persian"). */
  Engine.prototype.findPets = function (M, pending) {
    var out = [], mask = M;
    for (var i = 0; i < this.petWords.length; i++) {
      var pw = this.petWords[i], re = new RegExp(pw.re.source, 'g'), m;
      while ((m = re.exec(mask))) {
        var idx = m.index, before = mask.slice(Math.max(0, idx - 40), idx), after = mask.slice(idx + m[0].length, idx + m[0].length + 8);
        if (/^ (cut|style|food|hair|shampoo|visit|friendly|sitting|sitter|taxi|hotel)\b/.test(after)) continue;
        var cm = before.match(/ (\d+|a|an|one|two|three|four|five|six|couple of|my|our|have|got|for|both|his|her|another|other|second|new|adopted|rescued)((?! (about|of|with|to|from|at|on|in|and|or|like|than|by|as|if|but|the|is|are|was)\b) [a-z0-9]+){0,3}\s*$/);
        var direct = before.match(/ (\d+|one|two|three|four|five|six)( [a-z]+){0,2}\s*$/);
        if (!cm && !pending) continue;
        var plural = pw.w !== pw.pet.label && (pw.w === pw.pet.plural || /s$/.test(pw.w) && !/ss$/.test(pw.w) && pw.pet.words.indexOf(pw.w.replace(/e?s$/, '')) >= 0);
        var count = 1;
        if (direct) { var tok = direct[1]; count = /^\d+$/.test(tok) ? +tok : (NUM_WORDS[tok] || 1); }
        else if (/ both( [a-z]+){0,3}\s*$/.test(before)) count = 2;
        else if (plural) count = 2;
        if (count > 6) count = 6;
        out.push({ type: pw.pet.id, word: pw.w, count: count, idx: idx, explicitCount: !!direct });
        mask = mask.slice(0, idx) + ' ' + Array(m[0].length).join('_') + mask.slice(idx + m[0].length);
        re.lastIndex = 0;
      }
    }
    out.sort(function (a, b) { return a.idx - b.idx; });
    return out;
  };
  Engine.prototype.parseAges = function (M) {
    var out = [], re = / (\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half a|half an) ?(?:and a half )?(years?|yrs?|yr|yo|year old|months?|mos?|mo|mths?|weeks?|wks?)(?= )/g, m;
    while ((m = re.exec(M))) {
      var n = /^[\d.]+$/.test(m[1]) ? parseFloat(m[1]) : /half/.test(m[1]) ? 0.5 : NUM_WORDS[m[1]];
      if (/and a half/.test(m[0])) n += 0.5;
      var unit = /^(y|yo)/.test(m[2]) ? 'year' : /^w/.test(m[2]) ? 'week' : 'month';
      var months = unit === 'year' ? n * 12 : unit === 'week' ? n / 4.3 : n;
      if (months > 480) { out.push({ err: true, idx: m.index }); continue; }
      out.push({ text: (n % 1 ? n : Math.round(n)) + ' ' + unit + (n === 1 ? '' : 's'), months: months, idx: m.index });
    }
    if (!out.length && (m = M.match(/ (\d{1,2}) (?:years? )?old /))) out.push({ text: m[1] + ' year' + (m[1] === '1' ? '' : 's'), months: +m[1] * 12, idx: m.index });
    if (!out.length && (m = M.match(/ (?:hes|shes|its|he is|she is|it is|aged|age is|age) (\d{1,2})(?= )(?! (am|pm|o clock|kg|kgs))/))) out.push({ text: m[1] + ' year' + (m[1] === '1' ? '' : 's'), months: +m[1] * 12, idx: m.index });
    return out;
  };
  Engine.prototype.findServices = function (M) {
    var M2 = M.replace(/ (nail|nails|claw|claws|beak|wing|wings|paw|paws) (trim|trims|trimming|trimmed|clip|clipping|cut|cutting)/g, ' nails ')
      .replace(/ (trim|clip|cut) (his |her |their |the |its )?(nails|claws|beak|wings)/g, ' nails ')
      .replace(/ (ear|ears) (infection|pain|smell|discharge)/g, ' earissue ');
    var ids = [];
    this.svcKw.forEach(function (s) { for (var i = 0; i < s.res.length; i++) { if (s.res[i].re.test(M2)) { ids.push(s.id); break; } } });
    if (ids.indexOf('spa') >= 0) ids = ids.filter(function (i) { return ['bath', 'groom', 'nail', 'ear', 'teeth'].indexOf(i) < 0; });
    if (ids.indexOf('groom') >= 0) ids = ids.filter(function (i) { return ['bath', 'haircut'].indexOf(i) < 0; });
    if (ids.indexOf('senior') >= 0) ids = ids.filter(function (i) { return i !== 'checkup'; });
    return ids;
  };
  Engine.prototype.gibberish = function (M) {
    var self = this, toks = M.trim().split(' ').filter(function (t) { return t; });
    if (!toks.length) return true;
    var alpha = toks.filter(function (t) { return /[a-z]/.test(t); });
    if (!alpha.length) return toks.every(function (t) { return /^\d{1,4}$/.test(t); }) ? false : true;
    var bad = 0, known = 0;
    alpha.forEach(function (t) {
      if (self.isKnownWord(t)) { known++; return; }
      if (KEYMASH.test(t) || /[bcdfghjklmnpqrstvwxz]{5,}/.test(t) || !/[aeiouy]/.test(t) || /(.)\1{3,}/.test(t)) bad++;
    });
    if (bad && bad >= alpha.length / 2) return true;
    return known / alpha.length < 0.34;
  };

  /* =====================================================================
   * Pet helpers
   * ===================================================================== */
  Engine.prototype.newPet = function (type) {
    return { type: type, label: (this.petById[type] || {}).label || 'pet', breed: null, size: null, name: null, age: null, services: [], need: null };
  };
  Engine.prototype.petRef = function (p) { return p.name || ('your ' + p.label); };
  Engine.prototype.petsRef = function (pets) {
    var self = this;
    if (pets.every(function (p) { return p.name; })) return joinList(pets.map(function (p) { return p.name; }));
    var counts = {};
    pets.forEach(function (p) { counts[p.label] = (counts[p.label] || 0) + 1; });
    var parts = Object.keys(counts).map(function (l) {
      var pd = self.cfg.pets.filter(function (x) { return x.label === l; })[0];
      return counts[l] === 1 ? l : (['', '', 'two', 'three', 'four', 'five', 'six'][counts[l]] || counts[l]) + ' ' + (pd ? pd.plural : l + 's');
    });
    return 'your ' + joinList(parts);
  };
  Engine.prototype.poss = function (name) { return /^your /.test(name) ? name + "'s" : name + "'s"; };

  /* =====================================================================
   * Flow
   * ===================================================================== */
  Engine.prototype.start = function () {
    return [this.msg('Hi! 🐾 How may I help you today?')];
  };
  Engine.prototype.quickChips = function () {
    return (this.cfg.quickReplies || []).map(function (q) { return typeof q === 'string' ? { label: q, value: q.replace(/^[^A-Za-z]+/, '') } : q; });
  };

  Engine.prototype.nextStep = function () {
    var b = this.state.b;
    if (b.focusTime && b.date && b.time == null) return { f: 'time' };
    if (!b.pets.length) return { f: 'petType' };
    var miss = function (k) { return b.pets.filter(function (p) { return !p[k]; }); };
    if (miss('breed').length) return { f: 'breed', pets: miss('breed') };
    if (miss('name').length) return { f: 'petName', pets: miss('name') };
    if (miss('age').length) return { f: 'age', pets: miss('age') };
    var ns = b.pets.filter(function (p) { return !p.services.length; });
    if (ns.length) return { f: 'need', pets: ns };
    if (!b.history) return { f: 'history' };
    if (!b.date) return { f: 'date' };
    if (b.time == null) return { f: 'time' };
    if (b.pickup == null) return { f: 'pickup' };
    if (!b.ownerName) return { f: 'ownerName' };
    if (!b.contact) return { f: 'contact' };
    if (/phone|both/.test(b.contact) && !b.phone) return { f: 'phone' };
    if (/email|both/.test(b.contact) && !b.email) return { f: 'email' };
    return { f: 'confirm' };
  };

  Engine.prototype.analyze = function (text) {
    var self = this;
    var parts = String(text).replace(/([?!])\s*/g, '$1\n').replace(/\.\s+(?=[A-Za-z])/g, '.\n').split(/\n+/)
      .map(function (s) { return s.trim(); }).filter(Boolean);
    var segs = parts.map(function (r) {
      var M = self.norm(r);
      return { R: r, M: M, isQ: /\?/.test(r) || RX.qword.test(M) || RX.shortQ.test(M) };
    });
    return { R: text, M: this.norm(text), segs: segs };
  };

  /* ---------- the main entry point: one (batched) user message in, bot messages out ---------- */
  Engine.prototype.handle = function (input) {
    var out = this.handleInner(input), s = this.state;
    if (out.length && out[0].text === s.lastReply && !/^Sorry, I (can't help|didn't quite)/.test(out[0].text)) {
      var t0 = out[0].text;
      out[0].text = this.pick('rep', ['Sure, ', 'Of course, ', 'As I mentioned, ']) + (/^I[ '’]/.test(t0) ? t0 : lowerFirst(t0));
    }
    if (out.length) s.lastReply = out[out.length - 1].text;
    return out;
  };
  Engine.prototype.handleInner = function (input) {
    var text = String(input == null ? '' : input).trim();
    if (!text) return [];
    var s = this.state, self = this;
    var A = this.analyze(text), M = A.M;
    var offer = s.pendingOffer; s.pendingOffer = null;

    // 1. Prompt injection → fixed refusal.
    if (RX.injection.test(M)) return [this.msg(OUT_OF_SCOPE)];

    var small = this.smallTalk(M);
    // 2. After a goodbye we stay quiet on further thanks / byes.
    if (s.stage === 'ended') {
      if (small.only) return [];
      s.stage = 'chat';
    }
    // 3. Emergencies override everything.
    if (RX.emergency.test(M)) return this.emergencyReply(A);

    // 4. After the closing message: "no / thanks / bye" → short goodbye, then stop.
    if (s.stage === 'after' && small.only) {
      if (small.yes && !small.no && !small.thanks && !small.bye) { s.stage = 'chat'; return [this.msg(this.pick('more', ['Of course! What else can I help you with?', 'Sure! What else would you like to know?']))]; }
      s.stage = 'ended';
      var lb = s.lastBooking, petName = lb && lb.pets && lb.pets[0] && lb.pets[0].name;
      return [this.msg(this.pick('bye', petName ? ['Thank you, goodbye, see you soon! 🐶', 'Thank you! Goodbye, and give ' + petName + ' a cuddle from us. 🐾'] : ['Thank you, goodbye, see you soon! 🐶', 'Thank you so much! Goodbye for now. 🐾']))];
    }

    if (s.stage === 'after') s.stage = 'chat';
    var b = s.b;
    var stepBefore = b.active ? this.nextStep() : null;
    var R = { answers: [], acks: [], errors: [], recognized: false, changed: [], got: {}, started: false, extraBefore: [] };

    // 4b. "I want to visit" → where we are + invitation to book
    if (RX.visit.test(M)) {
      var visitLine = 'We\'re at ' + this.vars.address + ', and you\'re welcome to drop by ' + this.biz.hoursText + '.';
      if (!b.active) { s.pendingOffer = { kind: 'book' }; return [this.msg(visitLine + ' Would you like to book an appointment as well?')]; }
      var stv = this.nextStep();
      return [this.msg(visitLine + ' ' + this.prompt(stv), this.chipsFor(stv) ? { chips: this.chipsFor(stv) } : null)];
    }

    // 5. Pending yes/no offers (earliest appointment after an emergency, or "would you like to book?").
    if (offer && small.only && (small.yes || small.no)) {
      if (small.yes) {
        b = this.ensureActive(R);
        if (offer.kind === 'earliest') {
          b.date = offer.iso; b.time = offer.min;
          if (b.notes.indexOf('Follow-up after an emergency') < 0) b.notes.push('Follow-up after an emergency');
          R.acks.push(this.pick('heldSlot', ['Done, I\'ve pencilled in ' + this.relDay(offer.iso) + ' at ' + fmtTime(offer.min) + ' for you.', 'Lovely, ' + this.relDay(offer.iso) + ' at ' + fmtTime(offer.min) + ' it is.']));
        }
        if (offer.kind === 'book' && offer.pickup) b.pickup = true;
        if (offer.kind === 'book' && offer.svc) { if (b.pets.length) b.pets.forEach(function (p) { if (!p.services.length) p.services = [offer.svc]; }); else b.pendingServices = [offer.svc]; }
        if (offer.kind === 'slot' && offer.iso && offer.min != null) { b.date = offer.iso; b.time = offer.min; R.acks.push(fmtTime(offer.min) + ' it is!'); }
        return this.compose(R, A, small);
      }
      if (offer.kind === 'earliest') return [this.msg('Of course. I hope your pet feels better soon. 💛')];
      if (offer.kind === 'book') return [this.msg('No problem! Feel free to ask me anything about {short}. 😊')];
      if (offer.kind === 'slot') return [this.msg('No problem. Which time would you prefer?', { chips: this.timeChips(b.date, null) })];
    }

    // 6. Booking summary: confirm or edit.
    if (stepBefore && stepBefore.f === 'confirm' && (b.summaryShown || b.awaitingEdit)) {
      var anyValue = this.hasValues(A);
      if (RX.confirmYes.test(M) && !anyValue && !RX.change.test(M.replace(/^ (yes|ok|okay) /, ' '))) return this.finalize();
      if (RX.edit.test(M) && !anyValue && M.trim().split(' ').length <= 3) {
        b.summaryShown = false; b.awaitingEdit = true;
        return [this.msg(this.pick('edit', ['Of course! What would you like to change?', 'Sure! What should I change: the date, time, services or contact details?']))];
      }
    }

    // 7. Answer questions first.
    this.answerQuestions(A, R);
    // 8. Pull every booking detail out of the message.
    this.extract(A, stepBefore, R, small);

    return this.compose(R, A, small, stepBefore, offer);
  };

  Engine.prototype.hasValues = function (A) {
    var M = A.M;
    return !!(this.findPhones(A.R).length || this.findEmails(A.R).length || this.parseDate(M) || (this.parseTime(M) || {}).min != null || this.findServices(M).length);
  };

  Engine.prototype.smallTalk = function (M) {
    var greet = RX.greet.test(M), thanks = RX.thanks.test(M), bye = RX.bye.test(M), yes = RX.yes.test(M), no = RX.no.test(M);
    var SMALL = toSet('hi hii hiii hello helo hey heya hiya yo namaste howdy good morning afternoon evening greetings thanks thank you so much very cheers appreciate appreciated it bye byee goodbye see ya cya ttyl night goodnight take care have a nice day yes yeah yep yup ya sure ok okay alright please do go ahead sounds definitely of course why not lets perfect great absolutely correct that works for me fine no nope nah nothing really thats is all im i am else more now set done never mind nevermind for again lovely awesome cool nice lot the help your well then wonderful super there team too also much was helpful amazing got grateful oh ah');
    var toks = M.trim().split(' ').filter(Boolean);
    var shortName = String(this.vars.short || '').toLowerCase();
    var only = toks.length > 0 && toks.every(function (t) { return SMALL[t] || t === shortName; });
    return { greet: greet, thanks: thanks, bye: bye, yes: yes, no: no, only: only && (greet || thanks || bye || yes || no) };
  };

  Engine.prototype.ensureActive = function (R) {
    var s = this.state, b = s.b;
    if (!b.active) {
      b.active = true; R.started = true;
      if (s.profile) {
        b.ownerName = b.ownerName || s.profile.ownerName;
        b.contact = b.contact || s.profile.contact; b.phone = b.phone || s.profile.phone; b.email = b.email || s.profile.email;
      }
    }
    return b;
  };

  Engine.prototype.emergencyReply = function (A) {
    var s = this.state;
    // Quietly remember which pet this is about.
    var pets = this.findPets(A.M, false);
    if (pets.length && !s.b.pets.length) { var self = this; pets.forEach(function (f) { for (var i = 0; i < f.count; i++) s.b.pets.push(self.newPet(f.type)); }); }
    var lines = [EMERGENCY_FIRST, 'Our emergency line is {emergency}.'];
    var e = this.earliestSlot();
    if (e) {
      lines.push('Once your pet is safe, shall I book the earliest follow-up, ' + this.relDay(e.iso) + ' at ' + fmtTime(e.min) + '?');
      s.pendingOffer = { kind: 'earliest', iso: e.iso, min: e.min };
    }
    return [this.msg(lines.join('\n'))];
  };

  /* ---------- questions ---------- */
  Engine.prototype.scoreQA = function (item, M) {
    var total = 0;
    for (var g = 0; g < item.groups.length; g++) {
      var best = 0;
      for (var k = 0; k < item.groups[g].length; k++) { var kw = item.groups[g][k]; if (kw.w > best && kw.re.test(M)) best = kw.w; }
      if (!best) return 0;
      total += best;
    }
    item.bonus.forEach(function (kw) { if (kw.re.test(M)) total += 0.5; });
    return total;
  };
  Engine.prototype.bestQA = function (M, isQ) {
    var best = null, bestScore = 0;
    for (var pass = 0; pass < 2 && !best; pass++) {
      for (var i = 0; i < this.qa.length; i++) {
        var it = this.qa[i];
        if (it.e.q && !isQ) continue;
        if (!!it.e.fallback !== (pass === 1)) continue;
        var sc = this.scoreQA(it, M);
        if (sc && it.groups.length > 1) sc += 0.25 * it.groups.length;
        if (sc && it.e.boost) sc += it.e.boost;
        if (sc > bestScore) { best = it.e; bestScore = sc; }
      }
    }
    return best ? { e: best, score: bestScore } : null;
  };
  Engine.prototype.petGroupFor = function (M) {
    var pets = this.findPets(M, true);
    var t = pets.length ? pets[0].type : (this.findBreeds(M, false)[0] || {}).type || (this.state.b.pets[0] || {}).type;
    return t ? (this.petById[t] || {}).group : null;
  };
  Engine.prototype.answerFor = function (e, M) {
    if (typeof e.a === 'string') return e.a;
    var g = this.petGroupFor(M);
    return e.a[g] || e.a.default;
  };

  Engine.prototype.answerQuestions = function (A, R) {
    var self = this, s = this.state, b = s.b, seen = {};
    function add(id, text) { if (seen[id] || R.answers.length >= 3) return false; seen[id] = 1; R.answers.push({ id: id, text: text }); return true; }
    A.segs.forEach(function (seg) {
      var M = seg.M;
      seg.answered = false;
      if (OFFTOPIC.test(M) && !self.findServices(M).length && !self.findPets(M, true).length) { seg.offtopic = true; return; }
      if (RX.medical.test(M)) {
        add('medical', MEDICAL_FIRST + ' ' + self.pick('med2', ['You can also call us at {phone}.', 'For questions before then, call us at {phone}.']));
        seg.answered = true;
        seg.medical = true;
        return;
      }
      if (RX.staffNames.test(M)) {
        add('staffnames', 'I can\'t share team names here, but all our vets and groomers are licensed and experienced. Tell me a preference and I\'ll note it.');
        seg.answered = true; return;
      }
      var staffM = seg.R.match(/\b(?:dr\.?|doctor)\s+([A-Za-z]{2,})/i) || seg.R.match(/\b(?:groomer|vet|stylist)\s+(?:named|called)\s+([A-Za-z]{2,})/i);
      if (staffM && (COMMON[staffM[1].toLowerCase()] || STOP[staffM[1].toLowerCase()] || BAD_NAME[staffM[1].toLowerCase()])) staffM = null;
      if (staffM || RX.staffReq.test(M)) {
        var who = staffM ? (/^dr|^doctor/i.test(staffM[0]) ? 'Dr. ' + cap(staffM[1].toLowerCase()) : cap(staffM[1].toLowerCase())) : (M.match(RX.staffReq) || [''])[0].trim();
        b.staff = staffM ? who : 'Requested the ' + who;
        seg.answered = true;
        add('staffreq', 'I\'ve noted your request for ' + (staffM ? who : 'the ' + who) + ', and the team will confirm.');
        if (seg.isQ && !RX.book.test(M)) return;
      }
      if (RX.symptom.test(M) && !seg.isQ) {
        R.symptom = true;
        add('symptom', self.pick('sym', ['I\'m sorry to hear that. Our vet can check this properly at a General Checkup ({price:checkup}); if it gets worse suddenly, please see an emergency vet.', 'Oh no, I\'m sorry. Our vet can take a proper look at a General Checkup ({price:checkup}); if it gets worse quickly, please see an emergency vet.']));
      } else if (RX.symptom.test(M) && seg.isQ && !self.bestQA(M, true)) {
        add('symptomq', 'I can\'t assess symptoms, but our vet can take a proper look at a General Checkup ({price:checkup}). If it seems serious, please see an emergency vet right away.');
        seg.answered = true; return;
      }
      // availability question ("any slots tomorrow?")
      if (seg.isQ && RX.avail.test(M) && !RX.price.test(M)) {
        var d = self.parseDate(M);
        if (d && d.iso && !d.err) {
          var free = self.freeSlots(d.iso);
          add('avail', 'Yes, ' + self.whenText(d.iso).replace(/^on /, '') + ' still has free slots, like ' + joinList(free.slice(0, 3).map(fmtTime)) + '.');
          seg.avail = true; return;
        } else if (d && d.err === 'closed') {
          add('avail', 'We\'re closed on Sundays, but ' + fmtDate(fromIso(self.openDaysAhead(1, fromIso(d.iso))[0] ? isoOf(self.openDaysAhead(1, fromIso(d.iso))[0]) : d.iso)) + ' has free slots.');
          seg.answered = true; return;
        }
      }
      var qa = self.bestQA(M, seg.isQ);
      var svcs = self.findServices(M);
      // services / price list
      if (RX.servicesList.test(M) || (RX.price.test(M) && !svcs.length && !(qa && /how_much_multi|multi_discount|packages|home_pickup|farm|cancellation|late/.test(qa.e.id)) && !(b.pets.length && b.pets.some(function (p) { return p.services.length; })))) {
        if (add('pricelist', self.priceList())) seg.answered = true;
        seg.priceAsk = true; return;
      }
      if (RX.price.test(M) && !svcs.length && b.pets.some(function (p) { return p.services.length; }) && !(qa && /how_much_multi|multi_discount|packages/.test(qa.e.id))) {
        add('estimate', self.estimateText()); seg.answered = true; return;
      }
      if (RX.price.test(M) && svcs.length && !(qa && /how_much_multi|multi_discount/.test(qa.e.id) && qa.score >= 3)) {
        add('price', self.priceAnswer(svcs, M)); seg.answered = true; seg.priceAsk = true;
        if (RX.duration.test(M)) add('duration', self.durationAnswer(svcs));
        return;
      }
      if (RX.duration.test(M) && svcs.length) {
        add('duration', self.durationAnswer(svcs)); seg.answered = true; return;
      }
      if (qa) {
        if (/^(anxious|aggressive)$/.test(qa.e.id) && b.active && !seg.isQ) return;
        if (qa.e.id === 'reschedule' && b.active) return;                   // handled as a change in the booking
        if (qa.e.id === 'cancellation' && b.active && / cancel (it|this|the booking|my booking|the appointment|booking|appointment) /.test(M) && !/ (policy|how|can i|fee|charge)/.test(M)) return;
        var text = self.answerFor(qa.e, M);
        if (qa.e.id === 'home_pickup' && !seg.isQ && (b.active || A.segs.length > 1 || RX.book.test(A.M) || self.findPets(A.M, false).length || self.findBreeds(A.M, false).length)) return;
        if (qa.e.id === 'home_pickup') {
          if (b.active) { text = 'Yes! I\'ve added ' + self.pickupLine() + ' to your booking.'; b.pickup = true; }
          else { text = 'Yes, we offer ' + self.pickupLine() + '. Would you like me to add it to your booking?'; R.offerPickup = true; }
        }
        if (qa.e.id === 'hours') text += self.dayOpenNote(M);
        if (add(qa.e.id, text)) seg.answered = true; else seg.answered = true;
        if (/packages|how_much_multi|multi_discount|farm/.test(qa.e.id)) seg.priceAsk = true;
        // compound questions: "where are you and what's your number?" → answer each part
        if (seg.isQ) {
          seg.R.split(/\s+(?:and|also|plus)\s+|\s*[,&]\s*/i).forEach(function (part) {
            var pm = self.norm(part), sub = self.bestQA(pm, true) || self.bestQA(pm, false);
            if (sub && sub.e.id !== qa.e.id && !seen[sub.e.id] && sub.score >= 1 && !/^(anxious|aggressive|reschedule)$/.test(sub.e.id)) add(sub.e.id, self.answerFor(sub.e, pm) + (sub.e.id === 'hours' ? self.dayOpenNote(pm) : ''));
          });
        }
      }
    });
  };

  Engine.prototype.dayOpenNote = function (M) {
    var t = this.today(), d = null;
    if (/ today /.test(M)) d = t;
    else if (/ tomorrow /.test(M)) d = addDays(t, 1);
    else {
      var m = M.match(/ (monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?= )/);
      if (m) d = addDays(t, (DAY_ALIAS[m[1]] - t.getDay() + 7) % 7);
    }
    if (!d) return '';
    var label = isoOf(d) === isoOf(t) ? 'today' : isoOf(d) === isoOf(addDays(t, 1)) ? 'tomorrow' : fmtDate(d);
    if (!this.isOpenDay(d)) return ' ' + cap(label) + ' is a Sunday, so we\'re closed.';
    if (isoOf(d) === isoOf(t) && this.nowMin() >= hm(this.biz.closeTime)) return ' We\'re closed for today and back at 9 AM tomorrow.';
    return ' So yes, we\'re open ' + label + '!';
  };

  Engine.prototype.priceList = function () {
    var self = this, g = [], v = [];
    this.cfg.services.forEach(function (s) {
      var line;
      if (s.onRequest) return;
      line = s.name + ': ' + (s.flat ? money(s.flat) : 'from ' + money(s.prices[0])) + (s.perUnit ? ' ' + s.perUnit : '');
      (s.cat === 'groom' ? g : v).push(line);
    });
    var farm = this.svc.farm;
    return this.pick('plHead', ['Here are our services and prices:', 'Sure! Here\'s our price list:', 'Of course! Our services and prices:']) + '\n' + g.concat(v).join('\n') +
      (farm ? '\n' + farm.name + ': from ' + money(farm.from) + ' + travel' : '') + '\nPrices depend on size and are confirmed at the clinic.';
  };
  Engine.prototype.priceAnswer = function (ids, M) {
    var self = this, b = this.state.b;
    var br = this.findBreeds(M, false)[0];
    var size = br ? br.size : (b.pets.length === 1 ? this.petSize(b.pets[0]) : null);
    if (br && br.type !== 'dog' && br.type !== 'cat') size = 's';
    var pets = this.findPets(M, true);
    if (!br && pets.length && pets[0].type !== 'dog') size = (this.petById[pets[0].type] || {}).group === 'farm' ? 'farm' : 's';
    var parts = ids.slice(0, 4).map(function (id) {
      var s = self.svc[id];
      if (size === 'farm' || s.onRequest) return 'a ' + self.svc.farm.name + ' starts at ' + money(self.svc.farm.from) + ' plus travel';
      if (s.flat) return art(s.name) + ' ' + s.name + ' is ' + money(s.flat);
      var kind = br ? (br.type === 'dog' || br.type === 'cat' ? br.type : 'pet') : (b.pets.length === 1 ? b.pets[0].label : 'pet');
      if (size && SIZE_WORD[size]) return art(s.name) + ' ' + s.name + ' is ' + self.svcPrice(id, size).text + ' for a ' + (kind === 'cat' ? '' : SIZE_WORD[size] + ' ') + kind + (br ? ' like a ' + br.display : '');
      return art(s.name) + ' ' + s.name + ' starts at ' + money(s.prices[0]) + (s.perUnit ? ' ' + s.perUnit : '') + ', depending on size';
    });
    return cap(joinList(parts)) + '.';
  };
  Engine.prototype.durationAnswer = function (ids) {
    var self = this;
    return cap(joinList(ids.slice(0, 3).map(function (id) { return art(self.svc[id].name) + ' ' + self.svc[id].name + ' takes ' + self.svc[id].dur; }))) + '.';
  };

  /* ---------- extraction ---------- */
  Engine.prototype.extract = function (A, stepBefore, R, small) {
    var self = this, s = this.state, b = s.b;
    var f = stepBefore ? stepBefore.f : null;
    if (b.awaitingEdit) f = null;
    // Segments we may read booking details from: statements, or questions that weren't Q&A
    // (e.g. "can I come tomorrow at 3?"), or anything with a booking cue.
    var allowed = A.segs.filter(function (sg) { return !sg.medical && !sg.offtopic && (!sg.isQ || !sg.answered || sg.avail || (b.active && RX.book.test(sg.M))); });
    var X = { R: allowed.map(function (x) { return x.R; }).join(' '), M: ' ' + allowed.map(function (x) { return x.M.trim(); }).join(' ') + ' ' };
    var XM = X.M, XR = X.R;
    var changeMode = RX.change.test(A.M);
    var got = R.got;
    function note(n) { if (b.notes.indexOf(n) < 0) b.notes.push(n); }

    // phone / email can appear anywhere
    var phones = this.findPhones(A.R), emails = this.findEmails(A.R, f === 'email');
    var hasBookingSignal = false;

    // Booking intent
    if (RX.book.test(XM) || / (book a visit|book an appointment) /.test(A.M)) hasBookingSignal = true;

    // --- pets
    var foundPets = allowed.length ? this.findPets(XM, f === 'petType' || XM.trim().split(' ').length <= 3) : [];
    var foundBreeds = allowed.length ? this.findBreeds(XM, f === 'breed' || f === 'petType' || allowed.some(function (sg) { var t = sg.M.trim(); return self.breeds.some(function (br) { return br.phrase === t; }); })) : [];
    
    if (foundPets.length) {
      if (!b.pets.length) {
        foundPets.forEach(function (fp) { for (var i = 0; i < fp.count; i++) b.pets.push(self.newPet(fp.type)); });
        got.petType = true;
      } else {
        foundPets.forEach(function (fp) {
          var same = b.pets.filter(function (p) { return p.type === fp.type; });
          if (same.length) {
            var extra = / (also|another|too|as well|second|plus|other|add|one more) /.test(XM) && !fp.explicitCount ? 1 : 0;
            var want = Math.max(fp.count, same.length + extra);
            if (fp.explicitCount) want = Math.max(fp.count, same.length);
            for (var i = same.length; i < want; i++) { b.pets.push(self.newPet(fp.type)); got.petType = true; R.changed.push('added'); }
          } else if (changeMode && b.pets.length === 1 && !/ (also|another|too|as well|and my|plus|add) /.test(XM)) {
            var p = b.pets[0], old = p.label;
            var np = self.newPet(fp.type); np.name = p.name; np.age = p.age; np.services = p.services; np.need = p.need;
            b.pets[0] = np; R.changed.push('your pet to a ' + np.label + (old ? '' : '')); got.petType = true;
          } else {
            for (var j = 0; j < fp.count; j++) b.pets.push(self.newPet(fp.type));
            got.petType = true; if (stepBefore) R.changed.push('added');
          }
        });
      }
    }
    // --- breeds
    if (foundBreeds.length === 1 && f === 'breed') {
      var sameMissing = b.pets.filter(function (p) { return p.type === foundBreeds[0].type && !p.breed; });
      if (sameMissing.length > 1) sameMissing.slice(1).forEach(function (p) { p.breed = foundBreeds[0].display; if (p.type === 'dog' || p.type === 'cat') p.size = foundBreeds[0].size; });
    }
    if (foundBreeds.length) {
      foundBreeds.forEach(function (br) {
        var target = b.pets.filter(function (p) { return p.type === br.type && !p.breed; })[0];
        if (!target && changeMode) target = b.pets.filter(function (p) { return p.type === br.type; })[0];
        if (!target && !b.pets.length) { target = self.newPet(br.type); b.pets.push(target); got.petType = true; }
        if (!target && f === 'breed') target = b.pets.filter(function (p) { return !p.breed; })[0];
        if (!target) return;
        if (target.breed && target.breed !== br.display) R.changed.push(self.poss(self.petRef(target)) + ' breed to ' + br.display);
        target.breed = br.display;
        if (target.type === 'dog' || target.type === 'cat') target.size = br.size;
        got.breed = true;
      });
    }
    if (f === 'breed' && !got.breed && b.pets.length) {
      var miss = b.pets.filter(function (p) { return !p.breed; });
      var t0 = A.M;
      if (RX.notSure.test(t0) || / (mixed|mix|cross|crossbreed|mutt|stray|street|rescue|rescued|indie|desi|unknown|no breed|not sure|dont know) /.test(t0)) {
        miss.forEach(function (p) { p.breed = / (indie|desi|street|stray) /.test(t0) ? 'Indie' : 'Mixed / not sure'; if (p.breed === 'Indie' && p.type === 'dog') p.size = 'm'; });
        got.breed = true;
      } else {
        var chunks = A.R.split(/,| and |&|\n/i).map(function (c) { return c.trim(); }).filter(Boolean);
        var assigned = 0;
        chunks.forEach(function (c, i) {
          var cn = self.norm(c);
          if (self.cities.indexOf(cn.trim()) >= 0) return;
          if (!miss[i] || c.split(/\s+/).length > 4 || !/^[A-Za-z][A-Za-z\s'-]*$/.test(c) || self.gibberish(cn) || RX.qword.test(cn)) return;
          var words = cn.trim().split(' ');
          if (words.some(function (w) { return STOP[w] && w !== 'a'; })) return;
          if (self.findServices(cn).length || self.parseDate(cn) || words.some(function (w) { return self.isPetWord(w) || BAD_NAME[w]; })) return;
          miss[i].breed = titleCase(c.replace(/^(a|an|he is a|she is a|hes a|shes a|its a|it is a)\s+/i, ''));
          assigned++;
        });
        if (assigned) got.breed = true;
      }
    }

    // --- pet names
    var names = this.findPetNames(XR, XM, f === 'petName');
    if (names.length) {
      names.forEach(function (nm) {
        var target = null;
        if (nm.type) target = b.pets.filter(function (p) { return p.type === nm.type && !p.name; })[0] || (changeMode ? b.pets.filter(function (p) { return p.type === nm.type; })[0] : null);
        if (!target) target = b.pets.filter(function (p) { return !p.name; })[0];
        if (!target && changeMode && b.pets.length === 1) target = b.pets[0];
        if (!target && !b.pets.length && nm.type) { target = self.newPet(nm.type); b.pets.push(target); }
        if (!target) {
          if (f === 'petName' && b.pets.length && nm.list) { var np = self.newPet(b.pets[b.pets.length - 1].type); np.name = nm.name; b.pets.push(np); got.petName = true; }
          return;
        }
        if (target.name && target.name !== nm.name) R.changed.push(self.poss('your ' + target.label) + ' name to ' + nm.name);
        target.name = nm.name; got.petName = true;
      });
    }

    // --- ages
    var ages = allowed.length ? this.parseAges(XM) : [];
    var namedAge = XR.match(/\b([A-Z][a-z]+)\s+(?:is|turned|turns)\s+(\d{1,2}(?:\.\d)?)(?:\s*(years?|yrs?|months?|y\/?o))?\b/g);
    if (namedAge && b.pets.some(function (p) { return p.name; })) {
      namedAge.forEach(function (str) {
        var m = str.match(/^([A-Z][a-z]+)\s+(?:is|turned|turns)\s+(\d{1,2}(?:\.\d)?)(?:\s*(years?|yrs?|months?|y\/?o))?/);
        var p = b.pets.filter(function (x) { return x.name && x.name.toLowerCase() === m[1].toLowerCase(); })[0];
        if (!p) return;
        var unit = m[3] && /^m/.test(m[3]) ? 'month' : 'year';
        p.age = m[2] + ' ' + unit + (m[2] === '1' ? '' : 's'); got.age = true;
        ages = ages.filter(function (a) { return a.text.indexOf(m[2] + ' ') !== 0; });
      });
    }
    var badAge = ages.filter(function (a) { return a.err; }).length;
    ages = ages.filter(function (a) { return !a.err; });
    // "Bruno, 3" when we asked for the name and age together
    var commaAge = A.R.match(/,\s*(\d{1,2}(?:\.\d)?)\s*(?=,|$)/);
    if (!ages.length && commaAge && b.pets.some(function (p) { return !p.age; })) ages.push({ text: commaAge[1] + ' year' + (commaAge[1] === '1' ? '' : 's'), months: +commaAge[1] * 12 });
    if (!ages.length && f === 'petName' && b.pets.length && A.M.trim().split(' ').length <= 10 && !this.parseDate(A.M) && !phones.length) {
      var bareNums = (A.R.match(/(^|[\s,])(\d{1,2}(?:\.\d)?)(?![\d:\/]|\s*(am|pm|a\.m|p\.m|kg|lb|lbs|o'?clock))/gi) || []).map(function (x) { return x.replace(/[^\d.]/g, ''); });
      bareNums.forEach(function (n) { if (+n > 0 && +n <= 40) ages.push({ text: n + ' year' + (n === '1' ? '' : 's'), months: +n * 12 }); });
    }
    if (ages.length && b.pets.length) {
      var needAge = b.pets.filter(function (p) { return !p.age; });
      ages.forEach(function (a, i) {
        var p = needAge[i] || (changeMode || b.pets.length === 1 ? b.pets[Math.min(i, b.pets.length - 1)] : null);
        if (!p) return;
        if (p.age && p.age !== a.text) R.changed.push(self.poss(self.petRef(p)) + ' age to ' + a.text);
        p.age = a.text; got.age = true;
        if (a.months >= 96 && p.type === 'dog' || a.months >= 120 && p.type === 'cat') p.senior = true;
      });
    } else if (f === 'age' && !got.age) {
      var bare = A.M.match(/^ (\d{1,2}(?:\.\d)?)((?: and)? (\d{1,2}(?:\.\d)?))*( years?| yrs?)? $/);
      var nums = A.M.match(/\d{1,2}(?:\.\d)?/g);
      if (bare && nums) {
        var missA = b.pets.filter(function (p) { return !p.age; });
        nums.forEach(function (n, i) { if (missA[i] && +n <= 40) { missA[i].age = n + ' year' + (n === '1' ? '' : 's'); got.age = true; } });
      } else if (RX.notSure.test(A.M)) {
        b.pets.filter(function (p) { return !p.age; }).forEach(function (p) { p.age = 'Not sure'; }); got.age = true;
      } else if (/ (senior|old|elderly) /.test(A.M) && A.M.trim().split(' ').length <= 4) {
        b.pets.filter(function (p) { return !p.age; }).forEach(function (p) { p.age = 'Senior'; p.senior = true; }); got.age = true;
      }
    }
    if (badAge && f === 'age' && !got.age) R.errors.push({ field: 'age', text: 'Hmm, that age looks a little high! Roughly how old is ' + this.petRef(b.pets.filter(function (p) { return !p.age; })[0] || b.pets[0]) + '? Something like "3 years" or "8 months" is perfect.' });

    // --- services / needs
    var svcIds = allowed.length ? this.findServices(XM) : [];
    if (R.symptom && svcIds.indexOf('checkup') < 0 && b.active) svcIds.push('checkup');
    if (R.symptom && !b.active && !svcIds.length) R.offerCheckup = true;
    if (/ (new puppy|new kitten|just adopted|just got (a|him|her)|first vet visit) /.test(XM) && svcIds.indexOf('firstvisit') < 0) svcIds.push('firstvisit');
    if (svcIds.length) hasBookingSignal = hasBookingSignal || allowed.some(function (sg) { return !sg.isQ || RX.book.test(sg.M); });
    var needPending = f === 'need' || (stepBefore && b.pets.some(function (p) { return !p.services.length; }));
    var allHaveSvc = b.pets.length && b.pets.every(function (p) { return p.services.length; });
    if (svcIds.length && allHaveSvc && f !== 'need' && !changeMode && !/^ (and|also|plus|add) /.test(XM) && !/ (also|add|plus|as well|too|want|need|needs|would like|book|get|instead|another|and a|and an) /.test(XM)) svcIds = [];
    if (svcIds.length && (b.pets.length || hasBookingSignal || b.active)) {
      this.assignServices(svcIds, allowed, changeMode, R);
      got.need = true;
    } else if (f === 'need' && !svcIds.length) {
      var nm2 = A.M;
      if (!this.gibberish(nm2) && !A.segs.every(function (sg) { return sg.answered; })) {
        var gen = / (groom\w*|clean|cleaning|tidy|fresh|pamper|look nice|looking good) /.test(nm2) ? 'groom' : 'checkup';
        if (RX.notSure.test(nm2) || / (suggest|recommend|you tell|whatever|anything) /.test(nm2)) gen = 'checkup';
        b.pets.filter(function (p) { return !p.services.length; }).forEach(function (p) { p.services = [gen]; p.need = A.R.slice(0, 140); });
        got.need = true; R.needGuess = gen;
      }
    }
    if (b.pendingServices && b.pets.length) {
      b.pets.forEach(function (p) { if (!p.services.length) p.services = b.pendingServices.slice(); });
      b.pendingServices = null; got.need = true;
    }
    b.pets.forEach(function (p) {
      if ((self.petById[p.type] || {}).group === 'farm' && p.services.length && !(p.services.length === 1 && p.services[0] === 'farm')) {
        p.need = p.need || p.services.map(function (id) { return self.svc[id].name; }).join(', ');
        p.services = ['farm'];
      }
    });
    if (needPending && got.need && R.symptom) note('Health concern mentioned (vet to assess)');

    // --- history
    if (allowed.length) {
      var hm2 = XM;
      var looksLikeOther = !!(this.parseDate(A.M) || (this.parseTime(A.M) || {}).min != null || phones.length || emails.length);
      if (f === 'history' && !b.history && !looksLikeOther) {
        if (RX.no.test(A.M) || RX.firstTime.test(A.M) || /^ (none|never|not yet|nope|no never) /.test(A.M)) { b.history = 'First visit'; got.history = true; }
        else if (/^ (yes|yeah|yep|yup|ya|sure|ok) ?$/.test(A.M)) { b.history = 'Seen before'; got.history = true; }
        else if (!this.gibberish(A.M) && !A.segs.every(function (sg) { return sg.answered && sg.isQ; })) { b.history = A.R.replace(/\s+/g, ' ').slice(0, 160); got.history = true; }
      } else if (!b.history && (RX.firstTime.test(hm2) || RX.history.test(hm2)) && (b.pets.length || b.active)) {
        b.history = RX.firstTime.test(hm2) && !RX.history.test(hm2) ? 'First visit' : allowed.filter(function (sg) { return RX.history.test(sg.M) || RX.firstTime.test(sg.M); }).map(function (sg) { return sg.R; }).join(' ').slice(0, 160);
        got.history = true;
      }
      if (RX.anxious.test(hm2)) note('Nervous / anxious pet — go slowly');
      if (RX.bites.test(hm2)) note('May bite or snap — extra care');
    }
    if (RX.pickup.test(A.M) && (b.active || hasBookingSignal || got.petType || got.breed || got.need)) { if (!b.pickup) got.pickup = true; b.pickup = true; }

    // --- home pickup (asked after the time)
    if (f === 'pickup' && b.pickup == null) {
      if (RX.no.test(A.M) || / (no need|not needed|dont need|do not need|ill bring|i will bring|well bring|we will bring|ill drop|we will come|ill come|i will come|myself|no pickup|without pickup)( |$)/.test(A.M)) { b.pickup = false; got.pickup = true; }
      else if (RX.yesish.test(A.M) || / (pickup|pick up|collect|need it|please do|yes please)( |$)/.test(A.M)) { b.pickup = true; got.pickup = true; }
    }

    // --- owner name
    var owner = this.findOwnerName(XR, f === 'ownerName', b);
    if (owner && owner !== b.ownerName) {
      if (b.ownerName) R.changed.push('your name to ' + owner);
      b.ownerName = owner; got.ownerName = true;
    }

    // --- date & time
    var dateRes = allowed.length ? this.parseDate(XM) : null;
    var timeRes = allowed.length ? this.parseTime(XM, f === 'time') : null;
    if (dateRes && dateRes.earliest && dateRes.iso) {
      b.date = dateRes.iso; got.date = true; hasBookingSignal = true;
      if (/ (earliest|soonest|first available|next available) /.test(XM) && !(timeRes && timeRes.min != null)) { b.time = this.freeSlots(dateRes.iso)[0]; got.time = true; }
    } else if (dateRes) {
      if (dateRes.err) R.errors.push(this.dateError(dateRes));
      else {
        if (b.date && b.date !== dateRes.iso) R.changed.push('the date to ' + fmtDate(fromIso(dateRes.iso)));
        if (b.date !== dateRes.iso) { b.date = dateRes.iso; this.resetErr('date'); }
        got.date = true; hasBookingSignal = true;
        if (b.time != null && !(timeRes && timeRes.min != null)) {
          var ct = this.checkTime(b.date, b.time);
          if (!ct.ok) { b.pendingTime = null; var oldT = b.time; b.time = null; R.timeDropped = { min: oldT, near: ct.near }; }
        }
      }
    }
    if (timeRes) {
      if (timeRes.pref) b.timePref = timeRes.pref;
      if (timeRes.err) R.errors.push(this.timeError({ err: 'unclear' }));
      else if (timeRes.min != null) {
        hasBookingSignal = true;
        if (!b.date) { b.pendingTime = timeRes.min; got.timeLater = true; }
        else {
          var tc = this.checkTime(b.date, timeRes.min);
          if (tc.ok) {
            if (b.time != null && b.time !== timeRes.min) R.changed.push('the time to ' + fmtTime(timeRes.min));
            b.time = timeRes.min; got.time = true; b.focusTime = false; this.resetErr('time');
          } else if (tc.err === 'taken') {
            R.taken = { min: timeRes.min, near: tc.near }; b.focusTime = true;
            if (tc.near.length) s.pendingOffer = { kind: 'slot', iso: b.date, min: tc.near[0] };
          } else R.errors.push(this.timeError(tc, timeRes.min));
        }
      } else if (timeRes.pref && f === 'time') got.timePref = true;
    }
    if (b.date && b.pendingTime != null && b.time == null) {
      var pt = this.checkTime(b.date, b.pendingTime);
      if (pt.ok) { b.time = b.pendingTime; got.time = true; }
      else if (pt.err === 'taken') { R.taken = { min: b.pendingTime, near: pt.near }; b.focusTime = true; if (pt.near.length) s.pendingOffer = { kind: 'slot', iso: b.date, min: pt.near[0] }; }
      else R.errors.push(this.timeError(pt, b.pendingTime));
      b.pendingTime = null;
    }
    // picking one of the suggested slots: "the first one" / "second"
    if (f === 'time' && b.time == null && R.lastSuggest) { /* reserved */ }

    // --- contact preference, phone, email
    if (f === 'contact' && !phones.length && !emails.length) {
      if (/ (both|either|any|phone and email|email and phone|all) /.test(A.M)) { b.contact = 'both'; got.contact = true; }
      else if (/ (phone|call|calls|text|sms|whatsapp|mobile|number|cell) /.test(A.M)) { b.contact = 'phone'; got.contact = true; }
      else if (/ (email|mail|e mail) /.test(A.M)) { b.contact = 'email'; got.contact = true; }
    }
    if (phones.length) {
      var valid = null;
      phones.forEach(function (p) { var v = self.validPhone(p); if (v && !valid) valid = v; });
      if (valid) {
        if (b.phone && b.phone !== valid) R.changed.push('your phone number');
        b.phone = valid; got.phone = true; this.resetErr('phone');
        if (!b.contact) b.contact = emails.length ? 'both' : 'phone';
        else if (b.contact === 'email') b.contact = 'both';
      } else if (f === 'phone' || f === 'contact' || (b.active && phones.some(function (p) { return p.digits.length >= 7; }))) {
        R.errors.push(this.phoneError());
      }
    } else if (f === 'phone' && !got.contact && !emails.length && !R.answers.length && !this.anyGot(got) && !RX.change.test(A.M)) {
      if (!small.only) R.errors.push(this.phoneError());
    }
    if (emails.length) {
      var okEmail = null, emErr = null;
      emails.forEach(function (e) { var c = self.checkEmail(e); if (c.ok && !okEmail) okEmail = c.ok; else if (!c.ok && !emErr) emErr = c; });
      if (okEmail) {
        if (b.email && b.email !== okEmail) R.changed.push('your email');
        b.email = okEmail; got.email = true; this.resetErr('email');
        if (!b.contact) b.contact = phones.length && b.phone ? 'both' : 'email';
        else if (b.contact === 'phone') b.contact = 'both';
      } else R.errors.push(this.emailError(emErr));
    } else if (f === 'email' && !this.anyGot(got) && !R.answers.length && !small.only && !RX.change.test(A.M)) {
      R.errors.push(this.emailError({ err: 'invalid' }));
    }

    // --- "change the date" without a new value → clear it so it's asked again
    if (changeMode && stepBefore) {
      var cm = A.M;
      if (/ (date|day)( |$)/.test(cm) && !got.date) { b.date = null; b.time = null; R.cleared = 'date'; }
      else if (/ (time|slot)( |$)/.test(cm) && !got.time && !got.date) { b.time = null; R.cleared = 'time'; }
      else if (/ (number|phone|mobile)( |$)/.test(cm) && !got.phone) { b.phone = null; if (b.contact === 'email') b.contact = 'both'; R.cleared = 'phone'; }
      else if (/ (email|mail)( |$)/.test(cm) && !got.email) { b.email = null; if (b.contact === 'phone') b.contact = 'both'; R.cleared = 'email'; }
      else if (/ (service|services|treatment|appointment type)( |$)/.test(cm) && !got.need) { b.pets.forEach(function (p) { p.services = []; }); b.told = false; R.cleared = 'need'; }
      else if (/ (contact)( |$)/.test(cm) && !got.contact) { b.contact = null; b.phone = null; b.email = null; R.cleared = 'contact'; }
      else if (/ my name( |$)/.test(cm) && !got.ownerName) { b.ownerName = null; R.cleared = 'ownerName'; }
      else if (/ (breed)( |$)/.test(cm) && !got.breed) { b.pets.forEach(function (p) { p.breed = null; }); R.cleared = 'breed'; }
      else if (/ (age)( |$)/.test(cm) && !got.age) { b.pets.forEach(function (p) { p.age = null; }); R.cleared = 'age'; }
      else if (/ (city|area|location)( |$)/.test(cm) && !got.city) { b.city = null; R.cleared = 'city'; }
    }

    // --- owner name: anything that isn't a name counts as a mistake
    if (f === 'ownerName' && !b.ownerName && !this.anyGot(got) && !R.answers.length && !small.only && !RX.change.test(A.M) && !A.segs.every(function (sg) { return sg.isQ; })) R.errors.push(this.nameError());

    // --- cancelling the booking in progress
    if (b.active && / cancel (it|this|the booking|my booking|the appointment|booking|appointment|everything)( |$)|^ (cancel|stop|forget it|start over|restart)( |$)/.test(A.M) && !/ (policy|how|can i|fee|charge)/.test(A.M)) {
      R.cancelBooking = true;
    }

    // --- did this message start or continue a booking?
    if (!b.active && (hasBookingSignal || ((got.need || got.date || got.petType || got.breed) && !R.answers.length))) this.ensureActive(R);
    if (b.awaitingEdit && this.anyGot(got)) b.awaitingEdit = false;
    if (b.awaitingEdit && R.cleared) b.awaitingEdit = false;
    R.recognized = this.anyGot(got) || R.errors.length > 0 || R.changed.length > 0 || !!R.taken || !!R.cleared || R.cancelBooking || hasBookingSignal;
    R.hasBookingSignal = hasBookingSignal;
  };

  /* Does the text talk about pets / our business at all? */
  Engine.prototype.petish = function (M) {
    var self = this;
    if (OFFTOPIC.test(M)) return false;
    return M.trim().split(' ').some(function (t) { return t.length > 2 && !COMMON[t] && !STOP[t] && (self.vocab[t] || self.isPetWord(t)); });
  };
  Engine.prototype.anyGot = function (got) { for (var k in got) if (got[k]) return true; return false; };

  Engine.prototype.assignServices = function (ids, segs, changeMode, R) {
    var self = this, b = this.state.b;
    var pets = b.pets;
    if (!pets.length) { b.pendingServices = uniq((b.pendingServices || []).concat(ids)); return; }
    var all = segs.map(function (s) { return s.R; }).join(' ');
    var clauses = all.split(/[.;\n]|,| and (?=(?:a |an |the )?(?:[A-Z][a-z]+|my|his|her|for|\w+ (?:needs|wants|gets|for)))/);
    var assignedAny = false;
    if (pets.length > 1) {
      clauses.forEach(function (c) {
        var cm = self.norm(c), cids = self.findServices(cm);
        if (!cids.length) return;
        var refs = pets.filter(function (p) {
          return (p.name && new RegExp('\\b' + esc(p.name) + '\\b', 'i').test(c)) || new RegExp(' ' + esc(p.label) + 's? ').test(cm);
        });
        if (/ (both|all|they|them|each|every) /.test(cm) || !refs.length) refs = pets.filter(function (p) { return !p.services.length || / (both|all|each) /.test(cm); });
        if (!refs.length) refs = changeMode ? pets : [];
        refs.forEach(function (p) { p.services = changeMode ? cids.slice() : uniq(p.services.concat(cids)); });
        if (refs.length) assignedAny = true;
      });
    }
    if (!assignedAny) {
      var targets = pets.filter(function (p) { return !p.services.length; });
      if (!targets.length) targets = pets.length === 1 ? pets : pets.slice(-1);
      targets.forEach(function (p) {
        var before = p.services.join();
        p.services = (changeMode && p.services.length) ? ids.slice() : uniq(p.services.concat(ids));
        if (p.services.indexOf('groom') >= 0) p.services = p.services.filter(function (i) { return ['bath', 'haircut'].indexOf(i) < 0; });
        if (before && before !== p.services.join()) R.changed.push('services');
      });
    }
    b.told = b.told && !R.changed.length;
  };
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  Engine.prototype.findPetNames = function (R, M, pending) {
    var self = this, out = [];
    function okName(n, strict) { return self.nameOk(n, strict); }
    var petAlt = this.petWords.map(function (p) { return esc(p.w); }).concat(this.breeds.map(function (b) { return esc(b.phrase); })).join('|');
    var m, re;
    // "his name is Bruno", "their names are Bruno and Luna", "my dog's name is Max"
    re = new RegExp('\\b(?:his|her|its|their|the (?:' + petAlt + ')|my (?:' + petAlt + ')|(?:' + petAlt + ')|pet)(?:\'s)? names? (?:is|are|=|:)\\s*([A-Za-z][\\w\'-]*(?:\\s*(?:,|and|&)\\s*[A-Za-z][\\w\'-]*)*)', 'i');
    if ((m = R.match(re))) {
      m[1].split(/\s*(?:,|\band\b|&)\s*/i).forEach(function (n) { var v = okName(n, false); if (v) out.push({ name: v, list: true }); });
      if (out.length) return out;
    }
    // "change his name to Rocco"
    if ((m = R.match(/\b(?:his|her|its|the|my (?:dog|cat|pet|puppy|kitten)|(?:dog|cat|pet))(?:'s)?\s+name\s+(?:to|is now|should be)\s+([A-Za-z][\w'-]*)/i))) { var vc = okName(m[1], false); if (vc) return [{ name: vc, change: true }]; }
    // "she's called Luna", "named Coco"
    re = /\b(?:called|named)\s+([A-Za-z][\w'-]*)/i;
    if ((m = R.match(re)) && !/\b(?:groomer|vet|stylist|doctor)\s+(?:called|named)/i.test(R)) { var v1 = okName(m[1], false); if (v1) out.push({ name: v1 }); }
    // "my dog Bruno", "my lab Bruno and my cat Luna"
    re = new RegExp('\\b(?:my|our)\\s+(?:[a-z]+\\s+){0,3}?(' + petAlt + ')s?,?\\s+([A-Za-z][\\w\'-]*)', 'gi');
    while ((m = re.exec(R))) {
      var cand = m[2], v2 = okName(cand, !/^[A-Z]/.test(cand));
      if (v2 && !out.some(function (o) { return o.name === v2; })) {
        var pw = this.petWords.filter(function (p) { return p.w === m[1].toLowerCase(); })[0];
        var br = this.breeds.filter(function (b) { return b.phrase === m[1].toLowerCase(); })[0];
        out.push({ name: v2, type: pw ? pw.pet.id : br ? br.type : null });
      }
    }
    // "Bruno is a 3 year old lab", "Bruno is my dog"
    re = /(?:^|[.!?]\s+|\n)([A-Z][a-z]{1,15})\s+is\s+(?:a|an|my|our|\d)/g;
    while ((m = re.exec(R))) {
      var v3 = okName(m[1], true);
      if (v3 && !out.some(function (o) { return o.name === v3; })) out.push({ name: v3 });
    }
    // "Bruno and Luna" / "Bruno" when we just asked for the name
    if (!out.length && pending) {
      var t = R.trim().replace(/[,\s]*\b\d{1,2}(\.\d)?\s*(years?|yrs?|y\/?o|months?|mos?|weeks?|wks?)?(\s*old)?\b/gi, ' ').replace(/\b(and )?(he|she|it)('s| is)?\s*$/i, '').replace(/\s+(is|aged|age)\s*$/i, '').replace(/\s+/g, ' ').trim().replace(/^(his|her|its|their|the)?\s*names?\s*(is|are|:)?\s*/i, '').replace(/^(it's|its|it is|he's|hes|he is|she's|shes|she is|they're|they are|called|named)\s+/i, '');
      var chunk = t.split(/[.!?\n]/)[0].split(/,\s*(?=(?:he|she|it|they|and he|and she)\b)/i)[0];
      var partsN = chunk.split(/\s*(?:,|\band\b|&)\s*/i).filter(Boolean);
      if (partsN.length <= 6) {
        var good = partsN.map(function (n) { return okName(n.replace(/\s+(?:he|she|it)('s| is).*$/i, ''), false); });
        if (good.length && good.every(Boolean)) good.forEach(function (n) { out.push({ name: n, list: true }); });
      }
    }
    return out;
  };

  Engine.prototype.findOwnerName = function (R, pending, b) {
    var m, self = this;
    function clean(str, strict) {
      var words = str.trim().split(/\s+/), keep = [];
      for (var i = 0; i < words.length && keep.length < 3; i++) {
        var w = words[i].replace(/[.,!?]+$/, ''), lw = w.toLowerCase();
        if (STOP[lw] || BAD_NAME[lw] || /^(from|here|calling|looking|and|with|in|at|my|i|the|a|need|want|would|wanted|please|for|this|its|it)$/.test(lw)) break;
        if (strict && (COMMON[lw] || self.vocab[lw] || self.cities.indexOf(lw) >= 0)) break;
        keep.push(w);
        if (/[.,!?]$/.test(words[i])) break;
      }
      return keep.length ? self.nameOk(keep.join(' '), false) : null;
    }
    if ((m = R.match(/\bmy name(?:'s| is)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,3})/i))) { var a = clean(m[1], false); if (a) return a; }
    if ((m = R.match(/\bname\s*[:=-]\s*([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,2})/i)) && !/\b(his|her|its|their|dog|cat|pet)('s)?\s+name\b/i.test(R)) { var b2 = clean(m[1], false); if (b2) return b2; }
    if ((m = R.match(/\b(?:i am|i'm|im|this is|call me)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,3})/i))) {
      var first = m[1].split(/\s+/)[0];
      var strict = !/^[A-Z]/.test(first) || /^(i am|i'm|im)$/i.test(m[0].split(/\s+/).slice(0, -1).join(' ').trim());
      var c = clean(m[1], strict || !pending);
      if (c) return c;
    }
    if ((m = R.match(/^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+here\b/))) { var d = clean(m[1], true); if (d) return d; }
    if ((m = R.match(/(?:^|[\s,.!])-\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/))) { var e = clean(m[1], true); if (e) return e; }
    if (pending) {
      var t = this.firstChunk(R.replace(/^(it's|its|it is|name is|name:|i'm|im|i am|this is|call me|you can call me)\s+/i, ''));
      return this.nameOk(t, false);
    }
    return null;
  };

  /* ---------- validation messages ---------- */
  Engine.prototype.resetErr = function (f) { this.state.err[f] = 0; };
  Engine.prototype.fail = function (field, detailed, shorts) {
    var s = this.state;
    var n = (s.err[field] = (s.err[field] || 0) + 1);
    var text;
    if (n === 1) text = detailed;
    else {
      var pool = shorts.filter(function (x) { return x !== s.lastErr[field]; });
      text = pool[Math.floor(this.rng() * pool.length)] || shorts[0];
    }
    s.lastErr[field] = text;
    if (n >= 3) {
      var extra = ['You can also call us at {phone}.', 'Or just call us at {phone}.', 'Feel free to call us at {phone} too.'];
      var lastX = s.lastErr[field + '_x'], pool2 = extra.filter(function (x) { return x !== lastX; });
      var x = pool2[(n - 3) % pool2.length];
      s.lastErr[field + '_x'] = x;
      text += ' ' + x;
    }
    return { field: field, text: text };
  };
  Engine.prototype.nameError = function () {
    return this.fail('ownerName', 'I just need a name for the booking, like "Emma" or "Emma Johnson".',
      ['Could you share just your name?', 'What name should I use? A first name is fine.', 'I only need your name here, like "Emma".', 'Just your name, and we\'re nearly done!']);
  };
  Engine.prototype.phoneError = function () {
    return this.fail('phone',
      'Hmm, that number doesn\'t look right. A 10-digit number like (512) 555-0142 works best.',
      ['That still doesn\'t look like a valid number. Mind checking it?', 'Hmm, I couldn\'t read that as a phone number. One more try?', 'That number seems a digit or two off. Could you double-check?', 'I still can\'t use that number. Could you try again?']);
  };
  Engine.prototype.emailError = function (e) {
    if (e && e.err === 'typo') {
      return this.fail('email', 'I think there\'s a small typo. Did you mean ' + e.suggestion + '?',
        ['Did you mean ' + e.suggestion + '?', 'That domain looks a little off. Is it ' + e.suggestion + '?']);
    }
    return this.fail('email', 'That email looks a little off. It should look like name@example.com.',
      ['That email still doesn\'t look right. Mind checking it?', 'Hmm, I can\'t use that address. One more try?', 'Something\'s off with that email. Could you double-check?', 'I still can\'t read that as an email. Could you try again?']);
  };
  Engine.prototype.dateError = function (d) {
    var ex = fmtDate(this.openDaysAhead(3)[2] || addDays(this.today(), 3));
    if (d.err === 'impossible') return this.fail('date', d.month + ' only has ' + d.dim + ' days. Could you pick another date, like "tomorrow" or "' + ex + '"?',
      ['That date isn\'t on the calendar. Another one?', 'Hmm, that\'s not a real date. Which day works?', 'That day doesn\'t exist, sadly! Another date?']);
    if (d.err === 'past') return this.fail('date', 'That date has already passed. Could you pick an upcoming day, like "tomorrow" or "' + ex + '"?',
      ['That day\'s already gone. Which upcoming day works?', 'That one\'s in the past. How about this week?', 'We can\'t go back in time, sadly! Another date?']);
    if (d.err === 'closed') {
      var alt = this.openDaysAhead(2, fromIso(d.iso)).map(fmtDate);
      var before = addDays(fromIso(d.iso), -1), opts = [];
      if (before >= this.today() && this.isOpenDay(before) && this.freeSlots(isoOf(before)).length) opts.push(fmtDate(before));
      opts = opts.concat(alt).slice(0, 2);
      return this.fail('date', 'We\'re closed on Sundays. Would ' + joinList(opts, 'or') + ' work instead?',
        ['We\'re closed that day. Would ' + joinList(opts, 'or') + ' suit you?', 'Sundays are our day off. How about ' + joinList(opts, 'or') + '?', 'That\'s a Sunday, sorry! Another day?']);
    }
    if (d.err === 'toofar') return this.fail('date', 'We can book up to 3 months ahead. Could you pick a date before ' + fmtDate(addDays(this.today(), this.biz.bookingWindowDays || 90)) + '?',
      ['That\'s a bit too far ahead. Something within 3 months?', 'We only book 3 months out. A sooner date?']);
    if (d.err === 'todayDone') { var nx = this.openDaysAhead(1, addDays(this.today(), 1))[0]; return this.fail('date', 'We\'re fully booked for today, sorry! Would ' + fmtDate(nx) + ' work?', ['Today\'s all booked up. How about ' + fmtDate(nx) + '?', 'No slots left today. ' + fmtDate(nx) + ' instead?']); }
    if (d.err === 'full') { var nx2 = this.openDaysAhead(1, fromIso(d.iso))[0]; return { field: 'date', text: fmtDate(fromIso(d.iso)) + ' is fully booked, sorry! The next free day is ' + fmtDate(nx2) + '.' }; }
    return this.fail('date', 'I couldn\'t work out the date. Try "tomorrow", "Friday" or "' + ex + '".',
      ['Which day did you mean? "Tomorrow" or "' + ex + '" works.', 'Sorry, which date was that?']);
  };
  Engine.prototype.timeError = function (t) {
    if (t.err === 'offgrid') return { field: 'time', soft: true, text: 'Our slots run on the hour and half hour, so ' + joinList(t.near.map(fmtTime), 'or') + ' would work. Which do you prefer?' };
    if (t.err === 'outside') return this.fail('time', 'We\'re open 9 AM–7 PM, and the last slot is 6:00 PM. Could you pick a time like 11:00 AM or 4:30 PM?',
      ['That\'s outside our hours. Anything from 9 AM to 6 PM works.', 'We\'re closed then. How about between 9 AM and 6 PM?', 'That time\'s outside our hours. Another time?']);
    if (t.err === 'past') return this.fail('time', 'That time is too soon for today. The next free slots are ' + joinList((t.near || []).map(fmtTime), 'and') + '.',
      ['That one\'s too soon for today. Maybe ' + joinList((t.near || []).map(fmtTime), 'or') + '?', 'That time has gone for today. ' + joinList((t.near || []).map(fmtTime), 'or') + ' instead?']);
    return this.fail('time', 'I couldn\'t catch the time. Try "11 AM" or "4:30 PM".', ['Which time did you mean? "11 AM" works.', 'Sorry, what time was that?']);
  };

  /* ---------- prompts (one question at a time) ---------- */
  Engine.prototype.hoursLine = function () { return 'We\'re open ' + this.biz.hoursText + '.'; };
  Engine.prototype.pickupLine = function () {
    var hp = this.biz.homePickup;
    return 'home pickup and drop-off within ' + hp.radiusMiles + ' miles for ' + money(hp.feeEachWay) + ' each way';
  };
  Engine.prototype.prompt = function (st) {
    var b = this.state.b, p, pets = st.pets || [];
    switch (st.f) {
      case 'petType': return this.pick('pType', ['What type of pet do you have? A dog, cat, bird, rabbit, or something else?', 'What type of pet is the appointment for? A dog, cat, bird, rabbit, or another animal?']);
      case 'breed':
        if (pets.length === 1) { p = this.petRef(pets[0]); return this.pick('pBreed', ['What breed is ' + p + '?', 'Which breed is ' + p + '? "Mixed" is fine too.']); }
        return 'What breeds are ' + this.petsRef(pets) + '?';
      case 'petName':
        if (pets.length === 1) {
          p = this.petRef(pets[0]);
          return /^your /.test(p) ? 'What\'s ' + this.poss(p) + ' name and age?' : 'How old is ' + p + '?';
        }
        return 'What are their names and ages?';
      case 'age':
        if (pets.length === 1) { p = this.petRef(pets[0]); return this.pick('pAge', ['And how old is ' + p + '?', 'How old is ' + p + '?']); }
        return 'How old are ' + this.petsRef(pets) + '?';
      case 'need':
        if (b.pets.length === 1) return 'What would you like us to help with: grooming, a checkup, vaccination, or a concern?';
        if (pets.length === 1) return 'And what would you like us to help ' + this.petRef(pets[0]) + ' with?';
        return 'What would you like us to help each of them with: grooming, a checkup, vaccination, or a concern?';
      case 'history':
        var ref = this.petsRef(b.pets), many = b.pets.length > 1;
        return (many ? 'Have ' : 'Has ') + ref + ' been seen by a vet or groomer before? What happened last time?';
      case 'date':
        if (b.pets.length && b.pets.every(function (x) { return x.services.indexOf('farm') >= 0; })) return 'Which day would you like our team to visit?';
        return this.hoursLine() + ' ' + this.pick('pDate', ['Which day works best for you?', 'Which day would you like to come in?']);
      case 'time': return this.pick('pTime', ['What time works for you ' + this.whenText(b.date) + '?', 'Which time suits you ' + this.whenText(b.date) + '?']);
      case 'pickup': return 'Would you like ' + this.pickupLine() + '?';
      case 'ownerName': return this.pick('pOwner', ['May I have your name for the booking?', 'What name should I put the booking under?']);
      case 'contact': return 'What\'s the best way to reach you: phone, email, or both?';
      case 'phone': return this.pick('pPhone', ['What\'s your phone number?', 'Could you share your phone number?']);
      case 'email': return this.pick('pEmail', ['What\'s your email address?', 'And your email address?']);
    }
    return '';
  };
  Engine.prototype.chipsFor = function (st) {
    var b = this.state.b;
    if (st.f === 'date') return this.dateChips();
    if (st.f === 'time' && b.date) return this.timeChips(b.date, b.timePref);
    if (st.f === 'pickup') return [{ label: 'Yes, please', value: 'Yes, please' }, { label: 'No, thanks', value: 'No, thanks' }];
    if (st.f === 'contact') return [{ label: 'Phone', value: 'Phone' }, { label: 'Email', value: 'Email' }, { label: 'Both', value: 'Both' }];
    return null;
  };

  Engine.prototype.ackFor = function (R) {
    var b = this.state.b, got = R.got;
    if (R.changed.length) {
      var ch = R.changed.filter(function (c) { return c !== 'added' && c !== 'services'; });
      if (R.changed.indexOf('added') >= 0 && !ch.length) return this.pick('addPet', ['Lovely, I\'ve added another pet!', 'One more furry friend added! 🐾']);
      if (R.changed.indexOf('services') >= 0 && !ch.length) return this.pick('chSvc', ['Done, services updated.', 'Got it, I\'ve updated the services.']);
      return this.pick('chg', ['Done, I\'ve updated ' + joinList(ch) + '.', 'No problem, I\'ve changed ' + joinList(ch) + '.']);
    }
    if (R.acks && R.acks.length) return '';
    if (R.started) return this.pick('start', ['Happy to help! 🐾', 'Lovely, let\'s get you booked in! 🐾', 'Of course! 🐾']);
    var keys = Object.keys(got).filter(function (k) { return got[k] && k !== 'timePref'; });
    if (keys.length >= 3) return this.pick('many', ['Thanks, got all of that!', 'Perfect, thank you!', 'Great, thanks for the details!']);
    if (got.ownerName) return this.pick('aOwner', ['Thanks, ' + b.ownerName.split(' ')[0] + '!', 'Great, thank you, ' + b.ownerName.split(' ')[0] + '!']);
    if (got.petName) { var named = b.pets.filter(function (p) { return p.name; }); var nm = named[named.length - 1].name; return named.length > 1 ? 'Lovely names!' : this.pick('aName', ['Aww, hello ' + nm + '! 🐾', nm + ' is such a sweet name!']); }
    if (got.petType && b.pets.length) { var last = b.pets[b.pets.length - 1], pd = this.petById[last.type] || {}; return b.pets.length > 1 ? 'A full house! 🐾' : cap(art(last.label)) + ' ' + last.label + ', lovely! ' + (pd.emoji || '🐾'); }
    if (got.breed) return this.pick('aBreed', ['Lovely!', 'Great, thanks!']);
    if (got.history) {
      var nervous = b.notes.some(function (n) { return /Nervous|bite/.test(n); });
      if (nervous) return 'Thanks for telling me; we\'ll take things nice and slow.';
      if (b.history === 'First visit') return 'No problem, we\'ll make the first visit a gentle one.';
      return this.pick('aHist', ['Thanks, that\'s helpful.', 'Got it, thanks for sharing.']);
    }
    if (got.age) return this.pick('aAge', ['Got it.', 'Thanks!']);
    if (got.time && b.time != null) return fmtTime(b.time) + ' it is!';
    if (got.date && b.date) return this.pick('aDate', [cap(this.relDay(b.date)) + ' it is! 📅', 'Great, ' + this.relDay(b.date) + '! 📅']);
    if (got.pickup) return b.pickup ? 'Pickup added! 🚗' : 'No problem.';
    if (got.contact || got.phone || got.email) return this.pick('aContact', ['Got it.', 'Perfect.', 'Thanks!']);
    return '';
  };

  /* One short line with the price of what was asked for. */
  Engine.prototype.servicesText = function () {
    var b = this.state.b, self = this, t = this.totals();
    if (b.pets.every(function (p) { return p.services.indexOf('farm') >= 0; })) return 'Farm visits start at ' + money(this.svc.farm.from) + ' plus travel.';
    if (b.pets.length === 1 && b.pets[0].services.length === 1) {
      var p = b.pets[0], id = p.services[0], pr = this.svcPrice(id, this.petSize(p));
      return cap(art(this.svc[id].name)) + ' ' + this.svc[id].name + ' for ' + this.petRef(p) + ' is ' + pr.text + '.';
    }
    var amount = t.lo === t.hi ? money(t.lo) : 'from ' + money(t.lo);
    return 'That comes to ' + amount + ' for ' + this.petsRef(b.pets) + (t.discount ? ', with ' + t.discount + '% off the second pet' : '') + '.';
  };
  Engine.prototype.totals = function () {
    var b = this.state.b, self = this, lo = 0, hi = 0, onReq = false, disc = this.biz.multiPetDiscount || 0;
    b.pets.forEach(function (p, i) {
      var size = self.petSize(p);
      p.services.forEach(function (id) {
        var pr = self.svcPrice(id, size === 'farm' ? null : size);
        if (pr.hi == null) { onReq = true; return; }
        var f = i > 0 ? (100 - disc) / 100 : 1;
        lo += pr.lo * f; hi += pr.hi * f;
      });
    });
    return { lo: Math.round(lo), hi: Math.round(hi), onReq: onReq, discount: b.pets.length > 1 && disc };
  };
  Engine.prototype.estimateText = function () {
    var t = this.totals();
    if (!t.hi) return 'Farm visits start at ' + money(this.svc.farm.from) + ' plus travel.';
    return 'Your booking comes to ' + (t.lo === t.hi ? money(t.lo) : 'about ' + money(t.lo) + '–' + money(t.hi)) + '; the final price is confirmed at the clinic.';
  };

  Engine.prototype.summaryCard = function () {
    var b = this.state.b, self = this, t = this.totals(), hp = this.biz.homePickup;
    var contact = [];
    if (/phone|both/.test(b.contact) && b.phone) contact.push('📞 ' + b.phone);
    if (/email|both/.test(b.contact) && b.email) contact.push(b.email);
    return {
      title: 'Booking summary',
      pets: b.pets.map(function (p, i) {
        var size = self.petSize(p);
        return {
          title: (p.name || cap(p.label)) + ' · ' + cap(p.label) + (p.breed ? ' · ' + p.breed : '') + (p.age ? ' · ' + p.age : ''),
          services: p.services.map(function (id) { var pr = self.svcPrice(id, size === 'farm' ? null : size); return self.svc[id].name + ' — ' + pr.text + (i > 0 && pr.hi != null && self.biz.multiPetDiscount ? ' (−' + self.biz.multiPetDiscount + '%)' : ''); }),
          need: p.need && (self.petById[p.type] || {}).group === 'farm' ? 'Needs: ' + p.need : null
        };
      }),
      rows: [
        ['📅 When', fmtDate(fromIso(b.date)) + ' at ' + fmtTime(b.time)],
        ['🚗 Pickup', b.pickup ? 'Yes (' + money(hp.feeEachWay) + ' each way)' : 'No, I\'ll bring my pet'],
        ['👤 Owner', b.ownerName],
        ['💬 Contact', contact.join('  ·  ')],
        ['🩺 History', b.history]
      ].concat(b.staff ? [['⭐ Request', b.staff + ' (team will confirm)']] : [])
        .concat(b.notes.length ? [['📝 Notes', b.notes.join('; ')]] : []),
      total: (t.hi ? 'Estimated total: ' + (t.lo === t.hi ? money(t.lo) : money(t.lo) + '–' + money(t.hi)) + (t.onReq ? ' + farm visit' : '') : 'Farm visit: from ' + money(this.svc.farm.from) + ' + travel') + (b.pickup ? ' + ' + money(hp.feeEachWay * 2) + ' pickup' : ''),
      footnote: 'Final price confirmed at the clinic.'
    };
  };

  Engine.prototype.finalize = function () {
    var s = this.state, b = s.b, self = this;
    var bk = {
      id: 'PC-' + Date.now().toString(36).toUpperCase().slice(-6),
      createdAt: new Date().toISOString(),
      business: this.vars.name,
      ownerName: b.ownerName, phone: b.phone, email: b.email, contactPref: b.contact,
      pets: b.pets.map(function (p) { return { name: p.name, type: p.label, breed: p.breed, age: p.age, services: p.services.map(function (id) { return self.svc[id].name; }), need: p.need }; }),
      dateISO: b.date, timeMin: b.time, dateLabel: fmtDateLong(fromIso(b.date)), timeLabel: fmtTime(b.time),
      history: b.history, notes: b.notes.slice(), staff: b.staff, pickup: !!b.pickup,
      estimate: (function () { var t = self.totals(); return t.hi ? (t.lo === t.hi ? money(t.lo) : money(t.lo) + '–' + money(t.hi)) : 'From ' + money(self.svc.farm.from); })(),
      durationMin: Math.min(240, Math.max(30, b.pets.reduce(function (acc, p) { return acc + p.services.reduce(function (a, id) { return a + ({ groom: 120, spa: 180, matted: 90, deshed: 75, haircut: 75, farm: 120, bath: 60 }[id] || 30); }, 0); }, 0))),
      address: this.vars.address, clinicPhone: this.vars.phone
    };
    s.bookings.push(bk);
    s.lastBooking = bk;
    s.profile = { ownerName: b.ownerName, contact: b.contact, phone: b.phone, email: b.email };
    var first = b.ownerName.split(' ')[0];
    var names = b.pets.map(function (p) { return p.name || ('your ' + p.label); });
    var when = fmtDateLong(fromIso(b.date)) + ' at ' + fmtTime(b.time);
    var closing = names.length === 1
      ? 'Lovely to meet you and ' + names[0] + ', ' + first + '! Your booking is confirmed for ' + when + '. We can\'t wait to see you both. Take care, and have a wonderful day! 🐾'
      : 'Lovely to meet you, ' + first + ', and ' + joinList(names) + ' too! Your booking is confirmed for ' + when + '. We can\'t wait to see you all. Take care, and have a wonderful day! 🐾';
    s.b = this.freshBooking();
    s.stage = 'after';
    return [
      this.msg(closing, { booking: bk, ics: true }),
      this.msg('Is there anything else I can help you with?')
    ];
  };

  /* ---------- compose the single reply ---------- */
  Engine.prototype.compose = function (R, A, small) {
    var s = this.state, b = s.b, parts = [], chips = null, out = [];
    small = small || {};

    if (R.cancelBooking) {
      s.b = this.freshBooking();
      return [this.msg(this.pick('cancelB', ['No problem, I\'ve cancelled that booking request. Anything else I can help with?', 'All right, I\'ve cleared that booking. Anything else I can help with?']))];
    }

    R.answers.forEach(function (a) { parts.push(a.text); });
    (R.acks || []).forEach(function (a) { parts.push(a); });

    if (b.active) {
      var st = this.nextStep();
      var unparsed = !R.answers.length && !R.recognized && !small.only && !small.greet && !small.thanks && !R.acks.length && !R.needGuess;
      if (unparsed) {
        if (this.gibberish(A.M)) return [this.msg(GIBBERISH)];
        var words = A.M.trim().split(' ').length;
        var asked = A.segs.some(function (sg) { return sg.isQ; });
        if (A.segs.some(function (sg) { return sg.offtopic; }) || (asked && words > 2) || (words > 4 && !this.petish(A.M))) return [this.msg(OUT_OF_SCOPE)];
        if (st.f !== 'confirm') {
          var again = this.pick('again', ['Hmm, I didn\'t catch that.', 'Sorry, I missed that.', 'I\'m not sure I followed.']);
          return [this.msg(again + ' ' + this.prompt(st), this.chipsFor(st) ? { chips: this.chipsFor(st) } : null)];
        }
      }
      var ack = this.ackFor(R);
      if (ack && !R.answers.length && (!R.errors.length || R.changed.length)) parts.push(ack);
      if (small.greet && !R.started && !R.answers.length && !this.anyGot(R.got)) parts.unshift('Hi again! 😊');
      if (small.thanks && !R.answers.length && !this.anyGot(R.got)) parts.unshift('You\'re welcome!');
      if (R.cleared) parts.push(this.pick('clr', ['Sure, let\'s change that.', 'No problem.']));
      R.errors.forEach(function (e) { parts.push(e.text); });
      if (R.timeDropped) parts.push(fmtTime(R.timeDropped.min) + ' isn\'t free on the new date' + (R.timeDropped.near && R.timeDropped.near.length ? ', but ' + joinList(R.timeDropped.near.map(fmtTime)) + ' are.' : '.'));
      if (R.taken) {
        parts.push(fmtTime(R.taken.min) + ' is already booked' + (R.taken.near.length ? ', but ' + joinList(R.taken.near.map(fmtTime), 'and') + ' ' + (R.taken.near.length > 1 ? 'are' : 'is') + ' free. Would ' + (R.taken.near.length > 1 ? 'either' : 'that') + ' work?' : '. Could you pick another time?'));
        chips = this.timeChips(b.date, null);
      }
      var errOnStep = R.errors.some(function (e) { return e.field === st.f; });
      if (b.awaitingEdit && !this.anyGot(R.got) && !R.cleared) {
        if (!parts.length) parts.push('What would you like to change?');
      } else if (st.f === 'confirm') {
        b.told = true; b.summaryShown = true; b.awaitingEdit = false;
        var lead = parts.join(' ');
        var sumQ = R.changed.length ? 'Here\'s the updated summary. Does everything look right?' : this.pick('pConfirm', ['Here\'s your booking summary. Does everything look right?', 'Here\'s everything I have. Does it all look right?']);
        if (lead.length > 70) out.push(this.msg(lead));
        else if (lead) sumQ = lead + ' ' + sumQ;
        out.push(this.msg(sumQ, { card: this.summaryCard(), chips: [{ label: '✏️ Edit', value: 'Edit', kind: 'edit' }, { label: '✅ Confirm', value: 'Confirm', kind: 'confirm' }] }));
        return out;
      } else if (!R.taken && !errOnStep) {
        var pr = this.prompt(st);
        if (!b.told && b.history && b.pets.length && b.pets.every(function (p) { return p.services.length; })) {
          b.told = true;
          if (!R.answers.length) parts = parts.filter(function (x) { return x !== ack; });
          parts.push(this.servicesText());
        }
        if (st.f === 'time' && R.got.date && !R.got.time && b.timePref) {
          var fn = this.timeChips(b.date, b.timePref).filter(function (c) { return !c.disabled; });
          if (fn.length) pr = cap(this.relDay(b.date)) + ' ' + b.timePref + ', I have ' + joinList(fn.slice(0, 3).map(function (c) { return c.label; })) + ' free. Which suits you?';
        }
        if (R.answers.length && pr) {
          var used = R.answers.reduce(function (n, a) { return n + sentences(a.text); }, 0);
          if (used >= 2 || parts.length > R.answers.length) pr = shortQ(pr);
          if (!this.anyGot(R.got) && !/^And /.test(pr)) pr = this.pick('back', ['Now, ', 'So, ']) + lowerFirst(pr);
        }
        if (pr) parts.push(pr);
        chips = chips || this.chipsFor(st);
      } else if (errOnStep) chips = this.chipsFor(st);
      if (R.needGuess && parts.length) parts.splice(parts.length - 1, 0, R.needGuess === 'checkup' ? 'I\'ll start with a General Checkup so our vet can take a look.' : 'I\'ll pencil in Full Grooming.');
      if (!parts.length) parts.push(this.prompt(st));
      out.push(this.msg(parts.join(' ').replace(/\s+\n/g, '\n'), chips ? { chips: chips } : null));
      return out;
    }

    // Not booking (yet)
    if (!parts.length) {
      if (/^ (confirm|edit|confirm booking)( |$)/.test(A.M) && s.lastBooking) return [this.msg('Your booking is already confirmed! 🐾 Is there anything else I can help with?')];
      if (small.only || small.greet || small.thanks || small.bye) {
        if (small.bye) return [this.msg(this.pick('bye0', ['Thank you, goodbye, see you soon! 🐶', 'Goodbye, and see you soon! 🐾']))];
        if (small.thanks) return [this.msg(this.pick('ty0', ['You\'re very welcome! Anything else I can help with?', 'Happy to help! Anything else you\'d like to know?']))];
        if (small.greet) return [this.msg(this.pick('hi0', ['Hello! 😊 How can I help you today?', 'Hi there! 🐾 Would you like to book an appointment or ask a question?']))];
        if (small.yes) return [this.msg('Lovely! Would you like to book an appointment, or do you have a question?')];
        if (small.no) return [this.msg('No problem! I\'m here whenever you need me. 😊')];
      }
      var toks = A.M.trim().split(' ');
      if (toks.length <= 3 && this.cities.indexOf(A.M.trim()) >= 0) return [this.msg('Thanks! How can I help you today? I can book an appointment or answer questions about {short}.')];
      if (this.gibberish(A.M)) return [this.msg(GIBBERISH)];
      return [this.msg(OUT_OF_SCOPE)];
    }
    if (small.greet && !small.only) parts.unshift(this.pick('hiPre', ['Hi! 😊', 'Hello! 🐾']));
    if (R.offerCheckup && !s.pendingOffer) { parts.push(this.pick('ctaChk', ['Would you like me to book a checkup?', 'Shall I book a checkup for you?'])); s.pendingOffer = { kind: 'book', svc: 'checkup' }; out.push(this.msg(parts.join(' '))); return out; }
    if (R.offerPickup && !s.pendingOffer) { s.pendingOffer = { kind: 'book', pickup: true }; }
    var priceAsk = A.segs.some(function (sg) { return sg.priceAsk; });
    if (priceAsk && !s.ctaShown && s.stage !== 'after' && !R.offerPickup && !parts.some(function (p) { return /\?$/.test(p); })) {
      parts.push(this.pick('cta', ['Would you like to book an appointment?', 'Shall I book a slot for you?']));
      s.ctaShown = true; s.pendingOffer = { kind: 'book' };
    }
    out.push(this.msg(parts.join(parts.some(function (p) { return /\n/.test(p); }) ? '\n' : ' ')));
    return out;
  };

  /* =====================================================================
   * PART 2 — WIDGET (browser only)
   * ===================================================================== */
  var ICONS = {
    paw: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><ellipse cx="12" cy="16.3" rx="5" ry="4.2"/><ellipse cx="5.5" cy="10.6" rx="2.1" ry="2.7" transform="rotate(-18 5.5 10.6)"/><ellipse cx="9.6" cy="6.4" rx="2.1" ry="2.8" transform="rotate(-6 9.6 6.4)"/><ellipse cx="14.4" cy="6.4" rx="2.1" ry="2.8" transform="rotate(6 14.4 6.4)"/><ellipse cx="18.5" cy="10.6" rx="2.1" ry="2.7" transform="rotate(18 18.5 10.6)"/></g></svg>',
    plane: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2 20.6 3.6c.5-.2 1 .3.8.8L13.8 21.5c-.2.5-.9.5-1.1 0l-2.5-6.7-6.7-2.5c-.5-.2-.5-.9 0-1.1Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m10.2 14.8 5.2-5.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };
  var C = { line: '#F7EBD9', fill: '#2B1B12', pink: '#E8A6A0' };

  /* Full-body puppy used as the typing indicator (warm, softly colored). */
  function puppySvg() {
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<ellipse cx="50" cy="95" rx="26" ry="3.5" fill="rgba(0,0,0,.25)"/>' +
      '<g class="pup-tail"><path d="M68 76c9-1 15-7 16-16" fill="none" stroke="#C98B52" stroke-width="7" stroke-linecap="round"/></g>' +
      '<ellipse cx="50" cy="74" rx="21" ry="19" fill="#E3A86B"/>' +
      '<ellipse cx="50" cy="78" rx="11" ry="12.5" fill="#F7EBD9"/>' +
      '<ellipse cx="34" cy="90" rx="10" ry="5.5" fill="#D9985A"/><ellipse cx="66" cy="90" rx="10" ry="5.5" fill="#D9985A"/>' +
      '<ellipse cx="43.5" cy="91" rx="6" ry="4.6" fill="#F7EBD9"/><ellipse cx="56.5" cy="91" rx="6" ry="4.6" fill="#F7EBD9"/>' +
      '<path d="M41.5 89.5v2.5M44 89v2.6M46 89.5v2.4M54 89.5v2.4M56.5 89v2.6M59 89.5v2.5" stroke="#C98B52" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M34 58c8 6 24 6 32 0" fill="none" stroke="#8FB996" stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="50" cy="63.5" r="3.4" fill="#F0C58E" stroke="#C98B52" stroke-width="1"/>' +
      '<path d="M31 25c-11 1-14 12-12 22 1 6 6 9 10 7 3-7 3-18 2-29z" fill="#A9683A"/>' +
      '<path d="M69 25c11 1 14 12 12 22-1 6-6 9-10 7-3-7-3-18-2-29z" fill="#A9683A"/>' +
      '<circle cx="50" cy="38" r="21" fill="#E3A86B"/>' +
      '<ellipse cx="59" cy="31" rx="8" ry="7" fill="#D9985A" opacity=".7"/>' +
      '<ellipse cx="50" cy="47" rx="11" ry="8.5" fill="#F7EBD9"/>' +
      '<g class="pup-eyes"><ellipse cx="41" cy="35.5" rx="3" ry="3.6" fill="#3B2418"/><ellipse cx="59" cy="35.5" rx="3" ry="3.6" fill="#3B2418"/>' +
      '<circle cx="42" cy="34.3" r="1" fill="#fff"/><circle cx="60" cy="34.3" r="1" fill="#fff"/></g>' +
      '<ellipse cx="36" cy="44" rx="4" ry="2.4" fill="#F2A7A0" opacity=".75"/><ellipse cx="64" cy="44" rx="4" ry="2.4" fill="#F2A7A0" opacity=".75"/>' +
      '<ellipse cx="50" cy="43.2" rx="4" ry="3" fill="#3B2418"/>' +
      '<path d="M50 46v2.6m0 0c-1.6 2.6-4.4 2.6-5.8.8m5.8-.8c1.6 2.6 4.4 2.6 5.8.8" fill="none" stroke="#3B2418" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M48 50.6c.5 3.6 3.5 3.6 4 0z" fill="#F29C9C"/>' +
      '</svg>';
  }

  /* Four small line-art pets for the corners of the chat window. */
  var LINE = 'fill="' + C.fill + '" stroke="' + C.line + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  function sleepyCatSvg() { // top-left: a cat napping on the edge
    return '<svg viewBox="0 0 72 40" aria-hidden="true"><path d="M60 30c9 6-3 11-15 8" fill="none" stroke="' + C.line + '" stroke-width="2" stroke-linecap="round"/>' +
      '<ellipse cx="40" cy="27" rx="24" ry="12" ' + LINE + '/>' +
      '<path d="M8 22c0-7 5-11 10-11 6 0 10 4 10 11 0 6-4 9-10 9S8 28 8 22z" ' + LINE + '/>' +
      '<path d="M10 15 9 6l6 6M21 12l5-6 1 9" ' + LINE + '/>' +
      '<path d="M11.5 22c1.5 1.6 3 1.6 4.5 0M19.5 22c1.5 1.6 3 1.6 4.5 0" fill="none" stroke="' + C.line + '" stroke-width="1.5" stroke-linecap="round"/>' +
      '<text x="30" y="11" fill="' + C.line + '" font-size="8" font-family="Nunito,sans-serif" opacity=".7">z</text><text x="36" y="6" fill="' + C.line + '" font-size="6" font-family="Nunito,sans-serif" opacity=".55">z</text></svg>';
  }
  function peekDogSvg() { // top-right: a puppy peeking over the edge
    return '<svg viewBox="0 0 64 50" aria-hidden="true"><path d="M17 14C7 13 4 24 6 32c1 5 5 7 8 5 2-8 3-15 3-23z" ' + LINE + '/><path d="M47 14c10-1 13 10 11 18-1 5-5 7-8 5-2-8-3-15-3-23z" ' + LINE + '/>' +
      '<path d="M16 50V28c0-12 7-20 16-20s16 8 16 20v22" ' + LINE + '/>' +
      '<ellipse cx="32" cy="38" rx="8" ry="6" ' + LINE + '/><circle cx="25" cy="27" r="2.2" fill="' + C.line + '"/><circle cx="39" cy="27" r="2.2" fill="' + C.line + '"/>' +
      '<ellipse cx="32" cy="34.5" rx="3.2" ry="2.3" fill="' + C.line + '"/><path d="M32 37v2m0 0c-1.5 2-3.5 2-4.5.5m4.5-.5c1.5 2 3.5 2 4.5.5" fill="none" stroke="' + C.line + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<ellipse cx="18" cy="47" rx="7" ry="4" ' + LINE + '/><ellipse cx="46" cy="47" rx="7" ry="4" ' + LINE + '/></svg>';
  }
  function sittingCatSvg() { // bottom-left: a cat sitting beside the window
    return '<svg viewBox="0 0 48 64" aria-hidden="true"><path d="M33 58c10 1 14-6 11-13" fill="none" stroke="' + C.line + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M12 60c-4-9-3-20 4-27h16c7 7 8 18 4 27z" ' + LINE + '/>' +
      '<path d="M11 21 10 6l8 7h12l8-7-1 15c2 8-4 14-13 14S9 29 11 21z" ' + LINE + '/>' +
      '<ellipse cx="18.5" cy="21" rx="1.8" ry="2.4" fill="' + C.line + '"/><ellipse cx="29.5" cy="21" rx="1.8" ry="2.4" fill="' + C.line + '"/>' +
      '<path d="M22.5 26h3l-1.5 1.6z" fill="' + C.pink + '"/><path d="M17 27l-7-1M17 29l-7 1.5M31 27l7-1M31 29l7 1.5" stroke="' + C.line + '" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M20 50v10M28 50v10" stroke="' + C.line + '" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  function sittingDogSvg() { // bottom-right: a little dog sitting and wagging
    return '<svg viewBox="0 0 50 64" aria-hidden="true"><g class="c-wag"><path d="M37 54c8-1 11-7 10-13" fill="none" stroke="' + C.line + '" stroke-width="2.2" stroke-linecap="round"/></g>' +
      '<path d="M14 61c-3-10-2-19 3-25h16c5 6 6 15 3 25z" ' + LINE + '/>' +
      '<path d="M14 9C6 9 4 19 6 25c1 4 4 5 7 3 1-6 2-12 1-19zM36 9c8 0 10 10 8 16-1 4-4 5-7 3-1-6-2-12-1-19z" ' + LINE + '/>' +
      '<circle cx="25" cy="20" r="12" ' + LINE + '/><ellipse cx="25" cy="26" rx="6" ry="4.5" ' + LINE + '/>' +
      '<circle cx="20.5" cy="18" r="1.8" fill="' + C.line + '"/><circle cx="29.5" cy="18" r="1.8" fill="' + C.line + '"/><ellipse cx="25" cy="23.6" rx="2.4" ry="1.7" fill="' + C.line + '"/>' +
      '<path d="M21 49v12M29 49v12" stroke="' + C.line + '" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.pc{--bg:#2B1B12;--bg2:#36241a;--bg3:#422c1f;--cream:#F7EBD9;--cream2:#EBD7BC;--caramel1:#F0C58E;--caramel2:#D4925A;--border:#C9A27A;--ink:#2B1B12;--muted:rgba(247,235,217,.62);font-family:"Nunito",ui-rounded,system-ui,-apple-system,"Segoe UI",sans-serif;font-weight:300;color:var(--cream);-webkit-font-smoothing:antialiased}',
    'button{font-family:inherit}',
    /* launcher */
    '.launcher{position:fixed;right:24px;bottom:24px;width:64px;height:64px;border-radius:50%;border:0;cursor:pointer;z-index:2147483000;background:linear-gradient(140deg,var(--caramel1),var(--caramel2));color:var(--ink);display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:transform .25s ease}',
    '.launcher:hover{transform:scale(1.06)}',
    '.launcher svg{width:30px;height:30px;transition:transform .3s ease}',
    '.launcher::before{content:"";position:absolute;inset:0;border-radius:50%;background:var(--caramel1);opacity:.55;animation:pulse 2.4s ease-out infinite;z-index:-1}',
    '@keyframes pulse{0%{transform:scale(1);opacity:.5}80%,100%{transform:scale(1.65);opacity:0}}',
    '.tip{position:absolute;right:76px;top:50%;transform:translateY(-50%) translateX(6px);white-space:nowrap;background:var(--cream);color:var(--ink);padding:9px 14px;border-radius:14px 14px 4px 14px;font-size:14px;font-weight:400;box-shadow:0 6px 18px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}',
    '.launcher:hover .tip,.launcher.tip-on .tip{opacity:1;transform:translateY(-50%) translateX(0)}',
    '.pc.open .launcher .tip{display:none}',
    /* panel */
    '.panel{position:fixed;right:40px;bottom:100px;width:380px;height:min(640px,calc(100vh - 150px));z-index:2147483001;opacity:0;transform:translateY(16px) scale(.97);transform-origin:bottom right;pointer-events:none;transition:opacity .28s ease,transform .28s ease}',
    '.pc.open .panel{opacity:1;transform:none;pointer-events:auto}',
    '.card{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;background:var(--bg);border:1px solid rgba(247,235,217,.14);border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.45)}',
    '.corner{position:absolute;z-index:1;pointer-events:none;opacity:0;transition:opacity .4s ease .15s,transform .5s cubic-bezier(.34,1.56,.64,1)}',
    '.pc.open .corner{opacity:1}',
    '.corner svg{display:block;width:100%;height:100%;overflow:visible}',
    '.c-tl{width:60px;height:34px;top:-31px;left:28px;transform:translateY(10px)}',
    '.c-tr{width:54px;height:42px;top:-36px;right:34px;transform:translateY(14px);z-index:3}',
    '.c-bl{width:38px;height:50px;left:-31px;bottom:84px;transform:translateX(12px)}',
    '.c-br{width:40px;height:52px;right:-32px;bottom:120px;transform:translateX(-12px)}',
    '.pc.open .c-tl,.pc.open .c-tr,.pc.open .c-bl,.pc.open .c-br{transform:none}',
    '.c-tl svg{animation:breathe 3.6s ease-in-out infinite;transform-origin:50% 100%}',
    '.c-tr svg{animation:peekbob 5s ease-in-out infinite}',
    '.c-bl svg{animation:peekbob 6.5s ease-in-out 1.2s infinite}',
    '.c-wag{transform-box:fill-box;transform-origin:0 100%;animation:wag .5s ease-in-out infinite alternate}',
    '@keyframes breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.06)}}',
    '@keyframes peekbob{0%,85%,100%{transform:translateY(0)}90%{transform:translateY(-3px) rotate(-4deg)}95%{transform:translateY(-1px) rotate(3deg)}}',
    '@keyframes wag{from{transform:rotate(-10deg)}to{transform:rotate(14deg)}}',
    /* header */
    'header{position:relative;display:flex;align-items:center;gap:12px;padding:14px 12px 14px 16px;background:linear-gradient(180deg,var(--bg3),var(--bg2));border-bottom:1px solid rgba(247,235,217,.12)}',
    '.avatar{width:42px;height:42px;flex:0 0 42px;border-radius:50%;background:var(--cream);color:var(--ink);display:grid;place-items:center;box-shadow:0 0 0 3px rgba(247,235,217,.15)}',
    '.avatar svg{width:24px;height:24px}',
    '.who{flex:1;min-width:0}',
    '.who h2{margin:0;font-size:15px;font-weight:600;line-height:1.22;color:var(--cream);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}',
    '.who p{margin:2px 0 0;font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:6px}',
    '.dot{width:8px;height:8px;border-radius:50%;background:#9ED39A;box-shadow:0 0 0 3px rgba(158,211,154,.2)}',
    '.hbtn{min-width:44px;height:44px;border-radius:14px;border:1px solid rgba(247,235,217,.18);background:rgba(247,235,217,.06);color:var(--cream);display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font-size:13px;font-weight:400;padding:0 10px;transition:background .2s}',
    '.hbtn:hover{background:rgba(247,235,217,.14)}',
    '.hbtn svg{width:18px;height:18px}',
    /* messages */
    '.msgs{flex:1;overflow-y:auto;overflow-x:hidden;padding:18px 14px 10px;scroll-behavior:smooth;background:radial-gradient(120% 60% at 50% 0%,rgba(247,235,217,.05),transparent 60%)}',
    '.msgs::-webkit-scrollbar{width:6px}.msgs::-webkit-scrollbar-thumb{background:rgba(247,235,217,.18);border-radius:6px}',
    '.row{display:flex;flex-direction:column;margin:0 0 12px;max-width:100%}',
    '.row.user{align-items:flex-end}',
    '.row.bot{align-items:flex-start}',
    '.bubble{max-width:84%;padding:10px 14px;font-size:15px;font-weight:400;line-height:1.5;border-radius:18px;word-wrap:break-word;overflow-wrap:anywhere;white-space:pre-line;animation:fadeIn .32s ease both}',
    '.bot .bubble{background:var(--cream);color:var(--ink);border:1px solid var(--border);border-bottom-left-radius:4px}',
    '.user .bubble{background:linear-gradient(135deg,var(--caramel1),var(--caramel2));color:var(--ink);border-bottom-right-radius:4px;font-weight:400}',
    '@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '@keyframes popOut{0%{opacity:0;transform:scale(.2) translate(-10px,30px)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}',
    '.meta{font-size:11px;color:var(--muted);margin:4px 6px 0;display:flex;gap:8px;align-items:center}',
    '.seen{color:#B9DDB5;letter-spacing:-1px}.seen span{letter-spacing:0;margin-left:3px}',
    /* typing pet */
    '.typing{display:flex;align-items:flex-end;gap:8px;margin:0 0 12px;height:52px;overflow:visible}',
    '.tpet{width:46px;height:46px;transform-origin:20% 95%}',
    '.tpet svg{width:100%;height:100%;display:block;overflow:visible;animation:hop .9s ease-in-out infinite}',
    '.pup-eyes{transform-box:fill-box;transform-origin:center;animation:blink 3.2s infinite}',
    '.pup-tail{transform-box:fill-box;transform-origin:0% 100%;animation:wag .32s ease-in-out infinite alternate}',
    '.tlabel{font-size:12.5px;color:var(--muted);margin-bottom:6px}',
    '@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '@keyframes blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}',
    '.typing.grow .tpet{animation:grow .48s cubic-bezier(.34,1.56,.64,1) forwards}',
    '.typing.grow .tpet svg{animation:none}',
    '.typing.grow .tlabel{opacity:0;transition:opacity .15s}',
    '@keyframes grow{0%{transform:scale(1)}65%{transform:scale(2.15)}100%{transform:scale(1.9)}}',
    '.bot .bubble.pop{animation:popOut .5s cubic-bezier(.34,1.56,.64,1) both;transform-origin:0 100%}',
    /* chips */
    '.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px;max-width:100%}',
    '.chip,.qbtn{min-height:40px;padding:8px 14px;border-radius:999px;border:1px solid rgba(247,235,217,.38);background:rgba(247,235,217,.07);color:var(--cream);font-size:14px;font-weight:400;cursor:pointer;white-space:nowrap;transition:transform .18s ease,box-shadow .2s ease,background .2s ease,border-color .2s ease,color .2s ease;-webkit-tap-highlight-color:transparent}',
    '.chip{animation:fadeIn .35s ease both}',
    '.chip:hover:not(:disabled),.qbtn:hover{transform:translateY(-2px);background:rgba(240,197,142,.2);border-color:var(--caramel1);color:#fff;box-shadow:0 6px 14px rgba(0,0,0,.28),0 0 14px rgba(240,197,142,.35)}',
    '.chip:active:not(:disabled),.qbtn:active,.qbtn.tap{transform:translateY(0) scale(.94);background:rgba(240,197,142,.35);box-shadow:0 0 0 3px rgba(240,197,142,.25)}',
    '.chip:focus-visible,.qbtn:focus-visible{outline:2px solid var(--caramel1);outline-offset:2px}',
    '.chip:disabled{opacity:.42;cursor:not-allowed;text-decoration:line-through}',
    '.chip.picked{background:rgba(240,197,142,.25);border-color:var(--caramel1)}',
    '.qr{display:flex;gap:8px;padding:10px 12px 2px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;background:var(--bg2);border-top:1px solid rgba(247,235,217,.1);scroll-behavior:smooth;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}',
    '.qr::-webkit-scrollbar{display:none}',
    '.qbtn{flex:0 0 auto;min-height:38px;padding:7px 13px;font-size:13.5px}',
    /* summary card */
    '.sum{width:min(100%,330px);margin-top:8px;background:var(--cream);color:var(--ink);border:1px solid var(--border);border-radius:18px;padding:14px 14px 12px;animation:popOut .5s cubic-bezier(.34,1.56,.64,1) both;transform-origin:0 0}',
    '.sum h3{margin:0 0 8px;font-size:15px;font-weight:600;display:flex;align-items:center;gap:6px}',
    '.sum h3 svg{width:18px;height:18px;color:#B9773F}',
    '.pet{padding:8px 10px;border-radius:12px;background:rgba(43,27,18,.06);margin-bottom:8px}',
    '.pet b{font-weight:600;font-size:14px;display:block}',
    '.pet ul{margin:4px 0 0;padding-left:18px;font-size:13.5px}',
    '.sr{display:flex;gap:8px;font-size:13.5px;padding:3px 0;border-bottom:1px dashed rgba(43,27,18,.12)}',
    '.sr:last-of-type{border-bottom:0}',
    '.sr span:first-child{flex:0 0 92px;color:rgba(43,27,18,.65)}',
    '.sr span:last-child{flex:1;min-width:0;overflow-wrap:anywhere}',
    '.tot{margin-top:8px;font-size:14px;font-weight:600}',
    '.foot{font-size:12px;color:rgba(43,27,18,.6)}',
    '.sbtns{display:flex;gap:8px;margin-top:12px}',
    '.sbtn{flex:1;min-height:44px;border-radius:14px;font-size:15px;font-weight:400;cursor:pointer;border:1px solid var(--ink);background:transparent;color:var(--ink);transition:transform .15s,box-shadow .2s}',
    '.sbtn.ok{border:0;background:linear-gradient(135deg,var(--caramel1),var(--caramel2));box-shadow:0 4px 12px rgba(212,146,90,.35)}',
    '.sbtn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 14px rgba(43,27,18,.25)}',
    '.sbtn:active:not(:disabled){transform:scale(.96)}',
    '.sbtn:disabled{opacity:.45;cursor:default}',
    '.calbtn{margin-top:9px;min-height:44px;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;border:1px solid var(--caramel1);background:rgba(240,197,142,.12);color:var(--cream);font-size:14px;font-weight:400;cursor:pointer;animation:fadeIn .4s ease both}',
    '.calbtn:hover{background:rgba(240,197,142,.25)}',
    '.calbtn svg{width:18px;height:18px}',
    /* composer */
    'form{display:flex;gap:10px;align-items:center;padding:8px 12px 12px;background:var(--bg2)}',
    'input{flex:1;min-width:0;height:48px;border-radius:999px;border:1px solid rgba(247,235,217,.22);background:rgba(247,235,217,.07);color:var(--cream);font-family:inherit;font-weight:300;font-size:16px;padding:0 18px;outline:none;transition:border-color .2s,box-shadow .2s}',
    'input::placeholder{color:rgba(247,235,217,.5)}',
    'input:focus{border-color:var(--caramel1);box-shadow:0 0 0 3px rgba(240,197,142,.18)}',
    '.send{position:relative;width:48px;height:48px;flex:0 0 48px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(140deg,var(--caramel1),var(--caramel2));color:var(--ink);display:grid;place-items:center;overflow:hidden;transition:box-shadow .25s,transform .15s}',
    '.send:hover{box-shadow:0 0 0 4px rgba(240,197,142,.2),0 0 18px rgba(240,197,142,.6)}',
    '.send:active{transform:scale(.94)}',
    '.send svg{width:22px;height:22px}',
    '.send.fly svg{animation:fly .6s ease-in-out}',
    '@keyframes fly{0%{transform:none;opacity:1}45%{transform:translate(26px,-26px) rotate(8deg);opacity:0}46%{transform:translate(-26px,26px);opacity:0}100%{transform:none;opacity:1}}',
    '.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
    /* mobile: full screen */
    '@media (max-width:559px){',
    '.panel{right:0;bottom:0;left:0;top:0;width:100%;height:var(--vvh,100%);transform:translateY(24px);transform-origin:bottom center}',
    '.pc.open .panel{transform:translateY(var(--vvt,0px))}',
    '.card{border-radius:0;border:0}',
    '.corner{display:none}',
    '.qbtn{min-height:44px}',
    '.pc.open .launcher{display:none}',
    '.launcher{right:16px;bottom:16px}',
    '.chip{min-height:44px}',
    '.bubble{max-width:88%}',
    '.msgs{padding:14px 12px 8px}',
    '.newtxt{display:none}',
    'header{padding:10px 10px 10px 14px;padding-top:max(10px,env(safe-area-inset-top))}',
    'form{padding-bottom:max(12px,env(safe-area-inset-bottom))}',
    '}',
    '@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}'
  ].join('\n');

  function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fmtClock(ts) { var d = new Date(ts); var h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }

  function store(kind) {
    try { var st = kind === 'local' ? window.localStorage : window.sessionStorage; var k = '__pc_t'; st.setItem(k, '1'); st.removeItem(k); return st; } catch (e) { return null; }
  }

  function buildIcs(bk) {
    var d = fromIso(bk.dateISO), start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(bk.timeMin / 60), bk.timeMin % 60);
    var end = new Date(start.getTime() + (bk.durationMin || 60) * 60000);
    function f(x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; }
    function e(t) { return String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
    var now = new Date(), stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var petLine = bk.pets.map(function (p) { return (p.name || p.type) + ': ' + p.services.join(', '); }).join(' | ');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PawCare//AI Assistant//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + bk.id + '@pawcare-chatbot', 'DTSTAMP:' + stamp, 'DTSTART:' + f(start), 'DTEND:' + f(end),
      'SUMMARY:' + e(bk.business + ' – ' + bk.pets.map(function (p) { return p.name || p.type; }).join(' & ')),
      'LOCATION:' + e(bk.address), 'DESCRIPTION:' + e(petLine + '\nEstimate: ' + bk.estimate + ' (final price confirmed at the clinic)\nQuestions? Call ' + bk.clinicPhone),
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + e('Pet appointment at ' + bk.business), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  function Widget(cfg, opts) {
    this.cfg = cfg; this.opts = opts;
    this.queue = []; this.timer = null; this.busy = false; this.flushAfter = false; this.msgs = [];
    this.ss = store('session'); this.ls = store('local');
    this.key = 'pawcare_chat_' + slug(cfg.business.name);
    var self = this;
    this.engine = new Engine(cfg, { takenProvider: function (iso) { return self.bookedTimes(iso); } });
    this.mount();
  }

  Widget.prototype.bookedTimes = function (iso) {
    try { var all = JSON.parse((this.ls && this.ls.getItem('pawcare_bookings')) || '[]'); return all.filter(function (b) { return b.dateISO === iso; }).map(function (b) { return b.timeMin; }); } catch (e) { return []; }
  };

  Widget.prototype.mount = function () {
    var self = this, biz = this.cfg.business;
    if (!document.querySelector('link[data-pawcare-font]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-pawcare-font', '');
      l.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600&display=swap';
      document.head.appendChild(l);
    }
    var host = document.createElement('div');
    host.id = 'pawcare-chatbot';
    document.body.appendChild(host);
    var rootEl = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    this.root = rootEl;
    rootEl.innerHTML = '<style>' + CSS + '</style>' +
      '<div class="pc">' +
      '<button class="launcher" type="button" aria-label="Open chat with ' + escHtml(biz.name) + '">' + ICONS.paw + '<span class="tip">Need help? Chat with us! 🐾</span></button>' +
      '<section class="panel" role="dialog" aria-label="' + escHtml(biz.name) + ' chat">' +
      '<div class="corner c-tl">' + sleepyCatSvg() + '</div><div class="corner c-tr">' + peekDogSvg() + '</div>' +
      '<div class="corner c-bl">' + sittingCatSvg() + '</div><div class="corner c-br">' + sittingDogSvg() + '</div>' +
      '<div class="card">' +
      '<header><div class="avatar">' + ICONS.paw + '</div><div class="who"><h2>' + escHtml(biz.name) + '</h2><p><span class="dot"></span>Online · here to help</p></div>' +
      '<button class="hbtn newchat" type="button" aria-label="Start new chat" title="Start new chat">' + ICONS.refresh + '<span class="newtxt">New chat</span></button>' +
      '<button class="hbtn closebtn" type="button" aria-label="Close chat">' + ICONS.close + '</button></header>' +
      '<div class="msgs" role="log" aria-live="polite"></div>' +
      '<div class="qr" role="toolbar" aria-label="Quick questions">' + this.engine.quickChips().map(function (q) { return '<button type="button" class="qbtn" data-send="' + escHtml(q.value) + '">' + escHtml(q.label) + '</button>'; }).join('') + '</div>' +
      '<form autocomplete="off"><label class="sr-only" for="pc-input">Message</label><input id="pc-input" type="text" enterkeyhint="send" placeholder="Type your message…" maxlength="600"/>' +
      '<button class="send" type="submit" aria-label="Send">' + ICONS.plane + '</button></form>' +
      '</div></section></div>';
    var $ = function (sel) { return rootEl.querySelector(sel); };
    this.el = { pc: $('.pc'), launcher: $('.launcher'), panel: $('.panel'), msgs: $('.msgs'), form: $('form'), input: $('input'), send: $('.send') };
    this.el.launcher.addEventListener('click', function () { self.toggle(); });
    rootEl.querySelector('.card').addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-send]');
      if (!btn || btn.disabled) return;
      btn.classList.remove('tap'); void btn.offsetWidth; btn.classList.add('tap');
      setTimeout(function () { btn.classList.remove('tap'); }, 220);
      if (btn.classList.contains('chip')) btn.classList.add('picked');
      if (btn.getAttribute('data-kind') === 'confirm') { var sib = btn.parentNode.querySelectorAll('button'); for (var i = 0; i < sib.length; i++) sib[i].disabled = true; }
      self.sendChip(btn.getAttribute('data-send'));
    });
    var qr = rootEl.querySelector('.qr');
    qr.addEventListener('wheel', function (e) { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { qr.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    $('.closebtn').addEventListener('click', function () { self.close(); });
    $('.newchat').addEventListener('click', function () { self.newChat(); });
    this.el.form.addEventListener('submit', function (e) { e.preventDefault(); self.sendTyped(); });
    // every keystroke restarts the 4-second batching timer
    this.el.input.addEventListener('input', function () { if (self.queue.length) self.restartTimer(self.cfg.ui.batchDelayMs || 4000); });
    this.el.input.addEventListener('focus', function () { setTimeout(function () { self.scrollDown(); }, 300); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && self.isOpen) self.close(); });
    this.setupViewport();
    if (!this.restore()) this.greet();
    var wasOpen = this.ss && this.ss.getItem(this.key + '_open');
    if (this.opts.autoOpen || wasOpen === '1') this.open(true);
    else {
      setTimeout(function () { self.el.launcher.classList.add('tip-on'); }, 1200);
      setTimeout(function () { self.el.launcher.classList.remove('tip-on'); }, 7000);
    }
  };

  Widget.prototype.setupViewport = function () {
    var self = this, vv = window.visualViewport;
    function apply() {
      if (!vv) return;
      var small = window.innerWidth < 560;
      self.el.panel.style.setProperty('--vvh', small ? vv.height + 'px' : '');
      self.el.panel.style.setProperty('--vvt', small ? vv.offsetTop + 'px' : '0px');
      if (small && self.isOpen) self.scrollDown(true);
    }
    if (vv) { vv.addEventListener('resize', apply); vv.addEventListener('scroll', apply); }
    window.addEventListener('resize', apply);
    apply();
  };

  Widget.prototype.open = function (silent) {
    this.isOpen = true;
    this.el.pc.classList.add('open');
    this.el.launcher.setAttribute('aria-label', 'Close chat');
    if (window.innerWidth < 560) { this.prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    if (this.ss) this.ss.setItem(this.key + '_open', '1');
    this.scrollDown(true);
    var self = this;
    if (!silent || window.innerWidth >= 560) setTimeout(function () { if (window.innerWidth >= 560 || !silent) self.el.input.focus({ preventScroll: true }); }, 280);
  };
  Widget.prototype.close = function () {
    this.isOpen = false;
    this.el.pc.classList.remove('open');
    this.el.launcher.setAttribute('aria-label', 'Open chat');
    document.body.style.overflow = this.prevOverflow || '';
    if (this.ss) this.ss.setItem(this.key + '_open', '0');
  };
  Widget.prototype.toggle = function () { if (this.isOpen) this.close(); else this.open(); };

  Widget.prototype.greet = function () {
    var self = this;
    this.engine.start().forEach(function (m) { self.addBot(m, false); });
    this.save();
  };
  Widget.prototype.newChat = function () {
    clearTimeout(this.timer); this.timer = null; this.queue = []; this.busy = false; this.flushAfter = false;
    this.engine.reset(); this.msgs = [];
    this.el.msgs.innerHTML = '';
    this.greet();
    this.el.input.value = '';
    this.el.input.focus({ preventScroll: true });
  };

  Widget.prototype.save = function () {
    if (!this.ss) return;
    try { this.ss.setItem(this.key, JSON.stringify({ v: 1, msgs: this.msgs, state: this.engine.serialize() })); } catch (e) { /* storage full or blocked */ }
  };
  Widget.prototype.restore = function () {
    if (!this.ss) return false;
    try {
      var data = JSON.parse(this.ss.getItem(this.key) || 'null');
      if (!data || !data.msgs || !data.msgs.length) return false;
      this.engine.restore(data.state);
      var self = this, list = data.msgs;
      this.msgs = [];
      list.forEach(function (m, i) {
        if (m.from === 'user') self.addUser(m.text, m.ts, true);
        else self.addBot(m, false, true, i !== list.length - 1);
      });
      return true;
    } catch (e) { return false; }
  };

  Widget.prototype.scrollDown = function (instant) {
    var m = this.el.msgs;
    if (instant) { var b = m.style.scrollBehavior; m.style.scrollBehavior = 'auto'; m.scrollTop = m.scrollHeight; m.style.scrollBehavior = b; }
    else m.scrollTop = m.scrollHeight;
  };

  Widget.prototype.addUser = function (text, ts, restoring) {
    ts = ts || Date.now();
    var row = document.createElement('div');
    row.className = 'row user';
    row.innerHTML = '<div class="bubble">' + escHtml(text) + '</div><div class="meta"><span>' + fmtClock(ts) + '</span><span class="seen" title="Seen">✓✓<span>Seen</span></span></div>';
    this.el.msgs.appendChild(row);
    this.msgs.push({ from: 'user', text: text, ts: ts });
    this.scrollDown(restoring);
  };

  Widget.prototype.addBot = function (m, animate, restoring, stale) {
    var self = this, ts = m.ts || Date.now();
    var row = document.createElement('div');
    row.className = 'row bot';
    var html = '<div class="bubble' + (animate ? ' pop' : '') + '">' + escHtml(m.text) + '</div>';
    row.innerHTML = html;
    if (m.card) row.appendChild(this.renderCard(m.card, m.chips, stale));
    else if (m.chips && m.chips.length) {
      var wrap = document.createElement('div');
      wrap.className = 'chips';
      m.chips.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.textContent = c.label;
        b.setAttribute('data-send', c.value || c.label);
        if (c.disabled) { b.disabled = true; b.title = c.note || 'Already booked'; b.setAttribute('aria-label', c.label + ' (booked)'); }
        wrap.appendChild(b);
      });
      row.appendChild(wrap);
    }
    if (m.ics && m.booking) {
      var cal = document.createElement('button');
      cal.type = 'button'; cal.className = 'calbtn'; cal.innerHTML = ICONS.cal + '<span>Add to Calendar</span>';
      cal.addEventListener('click', function () { self.downloadIcs(m.booking); });
      row.appendChild(cal);
    }
    var meta = document.createElement('div');
    meta.className = 'meta'; meta.textContent = fmtClock(ts);
    row.appendChild(meta);
    this.el.msgs.appendChild(row);
    var stored = { from: 'bot', text: m.text, ts: ts };
    ['chips', 'card', 'ics', 'booking'].forEach(function (k) { if (m[k]) stored[k] = m[k]; });
    this.msgs.push(stored);
    if (m.booking && !restoring) this.saveBooking(m.booking);
    this.scrollDown(restoring);
  };

  Widget.prototype.renderCard = function (card, chips, stale) {
    var self = this, el = document.createElement('div');
    el.className = 'sum';
    var h = '<h3>' + ICONS.paw + escHtml(card.title) + '</h3>';
    card.pets.forEach(function (p) {
      h += '<div class="pet"><b>' + escHtml(p.title) + '</b><ul>' + p.services.map(function (s) { return '<li>' + escHtml(s) + '</li>'; }).join('') + '</ul>' + (p.need ? '<div class="foot">' + escHtml(p.need) + '</div>' : '') + '</div>';
    });
    card.rows.forEach(function (r) { if (r[1]) h += '<div class="sr"><span>' + escHtml(r[0]) + '</span><span>' + escHtml(r[1]) + '</span></div>'; });
    h += '<div class="tot">' + escHtml(card.total) + '</div><div class="foot">' + escHtml(card.footnote) + '</div><div class="sbtns"></div>';
    el.innerHTML = h;
    var btns = el.querySelector('.sbtns');
    (chips || []).forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sbtn' + (c.kind === 'confirm' ? ' ok' : ''); b.textContent = c.label;
      b.setAttribute('data-send', c.value); b.setAttribute('data-kind', c.kind || '');
      btns.appendChild(b);
    });
    return el;
  };

  Widget.prototype.saveBooking = function (bk) {
    try {
      if (this.ls) {
        var all = JSON.parse(this.ls.getItem('pawcare_bookings') || '[]');
        all.unshift(bk);
        this.ls.setItem('pawcare_bookings', JSON.stringify(all.slice(0, 200)));
      }
    } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent('pawcare:booking', { detail: bk })); } catch (e) { /* old browsers */ }
  };
  Widget.prototype.downloadIcs = function (bk) {
    var blob = new Blob([buildIcs(bk)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = slug(bk.business) + '-appointment.ics';
    this.root.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  };

  /* ---------- batching: queue messages, reply once after 4 s of silence ---------- */
  Widget.prototype.sendTyped = function () {
    var text = this.el.input.value.trim();
    if (!text) return;
    this.el.input.value = '';
    var s = this.el.send;
    s.classList.remove('fly'); void s.offsetWidth; s.classList.add('fly');
    this.enqueue(text, this.cfg.ui.batchDelayMs || 4000);
  };
  Widget.prototype.sendChip = function (value) { this.enqueue(value, this.cfg.ui.chipDelayMs || 1500); };
  Widget.prototype.enqueue = function (text, delay) {
    this.addUser(text);                          // "Seen" tick shows instantly
    this.queue.push(text);
    this.save();
    this.restartTimer(delay);
  };
  Widget.prototype.restartTimer = function (delay) {
    var self = this;
    clearTimeout(this.timer);
    this.timer = setTimeout(function () { self.timer = null; self.flush(); }, delay);
  };
  Widget.prototype.flush = function () {
    if (this.busy) { this.flushAfter = true; return; }
    if (!this.queue.length) return;
    var combined = this.queue.join('\n');
    this.queue = [];
    this.reply(combined);
  };

  /*
   * 🔌 CLAUDE API HOOK — the only place a reply is produced.
   * To upgrade from the free rule-based engine to Claude, make this async function call
   * your own serverless endpoint (never put an API key in the browser), e.g. a Netlify
   * Function that uses the official SDK:
   *
   *   // netlify/functions/chat.js
   *   import Anthropic from '@anthropic-ai/sdk';
   *   const client = new Anthropic();                       // reads ANTHROPIC_API_KEY
   *   export default async (req) => {
   *     const { messages, system } = await req.json();
   *     const res = await client.messages.create({
   *       model: 'claude-opus-5-5', max_tokens: 1024, system, messages
   *     });
   *     return Response.json({ text: res.content.find(b => b.type === 'text')?.text ?? '' });
   *   };
   *
   * Then here: const r = await fetch('/.netlify/functions/chat', { method: 'POST', body: JSON.stringify({...}) });
   * Keep this engine as the fallback (and for booking/validation logic) if the call fails.
   */
  Widget.prototype.getBotReply = function (text) {
    return Promise.resolve(this.engine.handle(text));
  };

  Widget.prototype.reply = async function (text) {
    this.busy = true;
    var replies = [];
    try { replies = await this.getBotReply(text); } catch (e) { replies = [{ text: 'Sorry, something went wrong on my side. You can always call us at ' + this.cfg.business.phone + '.' }]; }
    for (var i = 0; i < replies.length; i++) {
      var m = replies[i];
      var dur = i === 0 ? Math.min(2300, 800 + (m.text || '').length * 9) : 900;
      var t = this.showTyping(i);
      await sleep(dur);
      t.classList.add('grow');                 // the puppy grows big with a bounce…
      await sleep(480);
      t.remove();
      this.addBot(m, true);                     // …and the message pops out of it
      this.save();
      await sleep(250);
    }
    this.busy = false;
    if (this.flushAfter) { this.flushAfter = false; if (!this.timer) this.flush(); }
  };
  Widget.prototype.showTyping = function (i) {
    var row = document.createElement('div');
    row.className = 'typing';
    row.innerHTML = '<div class="tpet">' + puppySvg() + '</div><span class="tlabel">' + escHtml(this.cfg.business.shortName || 'We') + ' is typing…</span>';
    this.el.msgs.appendChild(row);
    this.scrollDown();
    return row;
  };

  /* ---------- boot ---------- */
  function readOverrides(script) {
    var o = {}, ds = (script && script.dataset) || {};
    ['name', 'city', 'phone'].forEach(function (k) { if (ds[k]) o[k] = ds[k]; });
    try {
      var q = new URLSearchParams(window.location.search);
      ['name', 'city', 'phone'].forEach(function (k) { var v = q.get(k); if (v && v.trim()) o[k] = v.trim().slice(0, 80); });
    } catch (e) { /* no URLSearchParams */ }
    return o;
  }
  function applyOverrides(cfg, o) {
    var c = JSON.parse(JSON.stringify(cfg));
    c.qa = cfg.qa; // keep references (functions not used, but cheap)
    if (o.name) { c.business.name = o.name; c.business.shortName = o.name; }
    if (o.city) c.business.city = o.city;
    if (o.phone) c.business.phone = o.phone;
    return c;
  }
  function boot() {
    var script = CURRENT_SCRIPT || document.querySelector('script[src*="chatbot.js"]');
    var ds = (script && script.dataset) || {};
    function go() {
      var base = root.PAWCARE_CONFIG;
      if (!base) { console.warn('[PawCare] config.js could not be loaded.'); return; }
      var cfg = applyOverrides(base, readOverrides(script));
      cfg.ui = cfg.ui || {};
      if (ds.standalone === 'true') document.title = cfg.business.name + ' – AI Assistant';
      var start = function () { root.PawCareChat = new Widget(cfg, { autoOpen: ds.open === 'true' || cfg.ui.autoOpen }); };
      if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    }
    if (root.PAWCARE_CONFIG) go();
    else {
      var s = document.createElement('script');
      var src = (script && script.src) ? script.src.replace(/chatbot\.js(\?.*)?$/, 'config.js') : 'config.js';
      s.src = src; s.onload = go; s.onerror = function () { console.warn('[PawCare] Failed to load ' + src); };
      document.head.appendChild(s);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Engine: Engine, buildIcs: buildIcs, _fmt: { fmtTime: fmtTime, fmtDate: fmtDate, isoOf: isoOf } };
  }
  if (IS_BROWSER) { root.PawCareEngine = Engine; boot(); }
})(typeof window !== 'undefined' ? window : this);
