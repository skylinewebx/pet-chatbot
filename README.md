# 🐾 PawCare AI Assistant

A cute AI chatbot for the fictional **PawCare Pet Clinic & Grooming**. It answers questions and books grooming and vet visits. It runs **free, with no API key**: a rule-based engine handles synonyms, typos, slang (tmrw, pls, u, appt, eve…), scoring and validation, so it works on any static host.

**Files**

| File | What it does |
|---|---|
| `index.html` | Demo page. The chat opens automatically, and an **Owner view** panel lists received bookings |
| `chatbot.js` | Engine + widget (Shadow DOM). Also works as a one-line embed |
| `config.js` | All business data: contact details, hours, services, prices and 60+ Q&A entries |
| `netlify.toml` | Netlify config (`publish = "."`) |
| `embed-example.html` | Shows the one-line embed on a plain website |
| `tests/run.js` | 14 scripted conversations with 75 checks (`node tests/run.js`) |
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
https://YOUR-SITE.netlify.app/?name=Happy%20Tails%20Vet&city=Pune&phone=%2B91%2090000%2011111
```

## Features

- **Message batching**: replies wait 4 s after the last message *or keystroke*, then answer everything in one reply (tested with 2–20 messages). A "Seen" tick appears instantly.
- **Typing pet**: instead of three dots, a tiny line-art dog or cat wiggles while the bot replies, grows with a bounce, and the message pops out of it.
- **Booking flow**: asks one thing at a time (city → pet → breed → name → age → need → history), tells the matching services and prices in plain text, then date (chips) → time (chips, taken slots crossed out, nearest free slots offered) → owner name → "What's the best way to reach you: phone, email, or both?" → summary card with **Edit / Confirm** → warm closing → **Add to Calendar** (.ics).
- **Extracts everything** from any message (one long message can complete a whole booking), supports **multiple pets** with different services in one combined summary, and understands **changes** at any point ("actually make it Friday at 4", "change his name to Rocco").
- **Validation** of name, phone, email, date and time: impossible dates (31 Feb), past dates, Sundays, out-of-hours times. The first mistake gets a detailed, friendly hint with an example; later mistakes get short, varied replies; from the 3rd mistake the clinic phone is offered too.
- **Safety**: never diagnoses, suggests or doses medicine. Emergencies start with *"Please take your pet to the nearest emergency vet right away."*, then the emergency number, then the earliest appointment. Questions about medicine, allergies or a pet's pregnancy get *"Our vet will guide you on that during your visit"* plus the clinic phone.
- **Scope**: off-topic requests and prompt injection get the fixed out-of-scope reply, and gibberish gets the rephrase reply.
- Quick-reply buttons for common questions (never for services), **Start new chat**, timestamps, chat kept in `sessionStorage`, and bookings stored in `localStorage` for the Owner view.
- Mobile: full screen under 560 px with a clear ✕, keeps the input above the keyboard (`visualViewport`), 16 px input text, buttons ≥ 44 px, no sideways scroll.

## Customise

Edit `config.js`: business details, hours (`openDays`, `openTime`, `lastSlot`), `services` (prices for small / medium / large pets, keywords) and the `qa` list. Each Q&A entry has keyword groups (`req`); every group must match. `word*` matches any ending.

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
node tests/run.js         # full transcripts + checks
node tests/run.js --quiet # summary only
node tests/explore.js     # extra transcripts
```
