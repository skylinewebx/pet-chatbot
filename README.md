# 🐾 PawCare AI Assistant

A cute AI chatbot for the fictional **PawCare Pet Clinic & Grooming** (42 Maple Lane, Austin, TX). It answers questions and books grooming and vet visits. It runs **free, with no API key**: a rule-based engine handles synonyms, typos, slang (tmrw, pls, u, appt, eve…), scoring and validation, so it works on any static host.

**Files**

| File | What it does |
|---|---|
| `index.html` | Demo page. The chat opens automatically, and an **Owner view** panel lists received bookings |
| `chatbot.js` | Engine + widget (Shadow DOM). Also works as a one-line embed |
| `config.js` | All business data: contact details, hours, services, US-dollar prices and 110 Q&As |
| `netlify.toml` | Netlify config (`publish = "."`) |
| `embed-example.html` | Shows the one-line embed on a plain website |
| `tests/hard.js` | 282 automated checks over 200+ customer messages (`node tests/hard.js`) |
| `tests/explore.js` | Extra transcripts for a quick read-through |

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8765
```

Then visit http://localhost:8765.

## Embed on any website (one line)

```html
<script src="https://YOUR-SITE.netlify.app/chatbot.js" data-name="Business Name"></script>
```

`chatbot.js` loads `config.js` from the same folder by itself. The widget lives in a Shadow DOM, so it never clashes with the host site's CSS. Optional attributes:

| Attribute | Effect |
|---|---|
| `data-name="…"` | Business name in the header and replies |
| `data-city="…"` / `data-phone="…"` | Override city and phone |
| `data-open="true"` | Open the chat on page load |
| `data-standalone="true"` | Set the tab title to `<Name> – AI Assistant` (used by `index.html`) |

## URL parameters

`?name=&city=&phone=` override the defaults everywhere: header, welcome, replies and the tab title.

```
https://YOUR-SITE.netlify.app/?name=Happy%20Tails%20Vet&city=Denver,%20CO&phone=(303)%20555-0110
```

## How it behaves

- **Short, clean replies**: one to three short sentences. Location, hours and pickup are one line each; prices are a short list ("Basic Bath: from $30"). All prices are in US dollars.
- **Quick-reply bar** that is always visible (Book a visit, Book an appointment, Services & prices, Opening hours, Location, Home pickup, Emergency). Buttons lift and glow on hover, press down on tap, and work every time, in any order (one delegated click handler).
- **Typing puppy**: a small full-body puppy bounces gently, blinks and wags its tail while the bot replies, then grows big with a bounce and the message pops out of it.
- **Four corner pets** (a napping cat, a peeking puppy, a sitting cat and a sitting dog) in line art on the chat window's corners, hidden on mobile.
- **Message batching**: replies wait 4 s after the last message *or keystroke*, then answer everything in one reply. A "Seen" tick appears instantly.
- **"Book a visit"** gives the address, invites people to drop by during opening hours, and asks "Would you like to book an appointment as well?"
- **Appointment flow**, one question at a time and never asked twice: pet type → breed → name and age → what they need → vet/groomer history → price in one line → day (chips) and time (slot chips, taken slots crossed out, nearest free slots offered) → home pickup (yes/no) → owner name → phone, email or both → summary card with **Edit / Confirm**. It never asks for the city. One-word answers ("dog", "tomorrow", "Karachi") are treated as answers to the current question only.
- **Closing**: "Lovely to meet you and Bruno, Priya! Your booking is confirmed for Friday, October 2 at 5:00 PM. We can't wait to see you both. Take care, and have a wonderful day! 🐾", then **Add to Calendar** (.ics) and one "Is there anything else I can help you with?". On no/thanks/bye: a short goodbye, then silence.
- **Validation** of name, phone (US 10-digit or +international), email, date and time, with friendly first hints, short varied follow-ups, and the clinic phone from the 3rd mistake.
- **Safety**: never diagnoses, suggests or doses medicine. Emergencies start with *"Please take your pet to the nearest emergency vet right away."*, then the emergency line, then the earliest appointment. Questions about medicine, allergies or a pet's pregnancy get *"Our vet will guide you on that during your visit."*
- **Scope**: off-topic requests and prompt injection get the fixed out-of-scope reply, and gibberish gets the rephrase reply.
- Start new chat, timestamps, chat kept in `sessionStorage`, and bookings stored in `localStorage` for the Owner view.
- Mobile: full screen under 560 px with a clear ✕, keeps the input above the keyboard (`visualViewport`), 16 px input text, buttons ≥ 44 px, no sideways scroll.

## Customise

Edit `config.js`: business details, hours (`openDays`, `openTime`, `lastSlot`), `homePickup`, `services` (prices for small / medium / large pets, keywords), `quickReplies` and the `qa` list. Each Q&A entry has keyword groups (`req`), and every group must match; `word*` matches any ending. `boost` raises an entry's priority and `fallback` makes it answer only when nothing more specific matches.

## Plug in Claude later

Search `chatbot.js` for **`🔌 CLAUDE API HOOK`**. `getBotReply()` is the single place a reply is produced. The comment shows a Netlify Function that calls the Claude Messages API with the official SDK, so the API key stays on the server and never reaches the browser. Keep the built-in engine as a fallback and for booking validation.

## Deploy on Netlify

1. **Add new site → Import an existing project → GitHub →** pick `pet-chatbot`.
2. Branch to deploy: `main`.
3. Base directory: *(leave empty)*.
4. Build command: *(leave empty)*.
5. Publish directory: `.`
6. Functions directory: *(leave empty)*.
7. Click **Deploy**. `netlify.toml` already sets `publish = "."`.

## Tests

```bash
node tests/hard.js            # 282 checks: relevance, length, English, dollars, no repeats
node tests/hard.js --verbose  # every message and reply
node tests/explore.js         # extra transcripts
```
