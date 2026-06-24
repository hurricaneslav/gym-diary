# Design Plan

Brief: minimalist gym diary Mini App for Telegram
- Black background, white borders, white text
- 3 tabs: Workouts / Exercises / Body Measurements
- Mobile-first, feels native

## Token System
- bg-primary: #0A0A0A (near-black, not pure black — less harsh)
- bg-card: #111111 (card surfaces)
- bg-input: #1A1A1A (input fields)
- border: #2A2A2A (subtle borders)
- border-active: #FFFFFF (active/selected borders)
- text-primary: #FFFFFF
- text-secondary: #888888 (muted labels, dates)
- accent: #FFFFFF (buttons, active tab)
- danger: #FF4444

## Typography
- Display: system-ui with letter-spacing -0.02em (tight, modern)
- Body: same, regular weight
- Data/numbers: tabular figures, monospace feel for weights/reps

## Signature element
Workout sets use a row-based input with a subtle left border flash on focus —
feels like a training log, not a form. The "previous result" hint appears as
a ghost line below the current set — like notes in the margin of a paper log.

## Layout
- Fixed tab bar at top (not bottom — mimics Telegram's native UI patterns)
- Cards with 1px white border, sharp corners (zero radius — disciplined)
- Full-bleed modal sheets slide up from bottom

