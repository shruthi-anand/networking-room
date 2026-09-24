# Problem statement v2: the Networking Room

## Relationship to v1

This supersedes the plain "under construction + LinkedIn/WhatsApp CTA" plan in `problemstatement.md` as the thing that actually gets built and goes live first. shruthianand.in is currently empty, so there's nothing to conflict with — this becomes the site's only live experience for now, doubling as both the general homepage and the QR-code destination for events. When the full portfolio site is ready later, this experience moves to its own path (e.g. `shruthianand.in/networking`) and the portfolio takes the root domain.

Keep `problemstatement.md` on file as a fallback in case a fast, simple version is ever needed before the room is ready — but it's not the active plan.

Build timeline: open-ended, not the earlier 2-hour budget. This is a multi-session build in VS Code with Claude Opus 5.5.

## The concept

The visitor is standing at their own desk in a beautifully designed, contemporary, slightly funky home office — first-person, over-the-desk vantage. Across the room, mounted on the door, is a basketball hoop. Two basketballs sit on the desk, ready to be thrown: a LinkedIn-blue ball with the LinkedIn mark, and a WhatsApp-green ball with the WhatsApp mark. Clicking a ball throws it toward the hoop; it drains through the net; the camera follows the shot down to a below-the-net angle looking up as the ball fills the whole screen in a circular wipe; the screen cuts to a solid color (LinkedIn blue or WhatsApp green) and routes to that destination.

It's a pun on networking, it's a bit playful, and the room itself is the payoff for "spatial" rather than just a backdrop — the visitor is meant to actually look around and notice things.

## The room

- **Desk**: cluttered-but-neat, lots of small objects arranged with care, not messy.
- **Whiteboard**: Shruthi's bio, one line below the other, nicely composed —
  Product Designer / AI Builder / Studying at IDC School of Design, IIT Bombay / Licensed Architect.
- **LED sign**: reads "Shruthi Anand," positioned peeking in from the side rather than fully in frame.
- **ID card** on the desk, with her profile photo on it: "Shruthi Anand — ePGD in Interaction Design, IDC IIT Bombay."
- **Notebook**, open to a page reading "Leave a message for Shruthi" — this is functional, not decorative (see Notebook contact form below).
- **MacBook** with cute, funny stickers on the lid.
- **Window**, on the wall opposite the door, looking out onto a beautiful Japanese city.
- **Mic stand and mic**, in another corner of the room — decorative for now.
- **Steaming cup of tea** on the desk, with looping animated steam.
- **Basketball hoop**, mounted on/behind the door.
- Shruthi's reference photos of the real office will guide color, mood, and layout — not something the 3D geometry needs to replicate literally.

## Persistent UI (overlaid on the scene)

- Motion-permission control, top-left corner: on load, a small Apple-style animated line-drawing hints at either tilting the phone or swiping left/right to look around. It auto-dismisses and shrinks to a small reopenable icon; tapping it re-triggers the motion-permission prompt.
- Page title "Networking" appears as the scene finishes loading.
- Load-in animation: the hoop/basketball forms as a wireframe first, then resolves into a solid orange basketball as the room fades in.

## Interaction flow

1. Room loads (wireframe-to-solid ball animation, title appears).
2. Visitor looks around: device tilt if motion is permitted, otherwise swipe/drag, pans the camera within a bounded arc around the desk view (not a full walk-around — exact angular range to be tuned at build time).
3. Visitor clicks/taps a ball. Control over the free-look camera ends here.
4. Scripted (keyframed, not physics-simulated) sequence: ball arcs to the hoop → drops through the net → camera reorients to below-net, looking up → ball fills the screen in a circular wipe → cut to a solid color screen (LinkedIn blue or WhatsApp green).
5. Routes to destination: LinkedIn opens the profile in a new tab. WhatsApp opens a chat with the prefilled event message (mechanism unchanged from v1, see below).

## What's unchanged from v1

- **WhatsApp event message**: `https://wa.me/917349079301?text=...` with a single `CURRENT_EVENT` config value baked into the code, edited by Shruthi the night before each event and redeployed via git push. No URL parameters, no visitor-facing settings, the QR code itself never changes. Message stays "Hey Shruthi, we met at {CURRENT_EVENT}. My name is ___" — the blank is literal, filled in by the recipient inside WhatsApp.
- **LinkedIn** opens the profile URL in a new tab.
- **Analytics**: Vercel Web Analytics — page views as a scan-count proxy, custom events for `linkedin_click` and `whatsapp_click`, extended here with a `notebook_message_sent` event if straightforward.
- **Anti-spam basics** on any form: a honeypot field.

## What's superseded

The plain "under construction" root page and its standalone contact-form block are folded into this experience — the notebook now serves that purpose, and the room itself is the homepage. No separate under-construction page is needed while this exists.

## Notebook contact form

Tapping/clicking the notebook opens a small overlay with a text field and a send button. Submits via a third-party form backend (Formspree or Web3Forms, whichever has the smoother setup at build time) to **workspace.shruthi@gmail.com** — same approach and same trade-off already accepted in v1 (submission passes through a third party's servers briefly).

## Text in the scene

Split by how likely each is to change:

- **Whiteboard bio** is expected to change over time, so it's built as editable text rather than baked artwork — rendered onto its plane as a canvas texture generated from a small config list in code (one line per bio entry). Updating it later is a config edit and a redeploy, the same mechanism as the WhatsApp event name.
- **ID card, LED sign, and notebook page label** stay **baked directly into the artwork** as image textures, per your original call — these are stable enough (name, credentials, page prompt) that re-exporting the art on the rare occasion one changes is fine. The ID card's texture also composites in the profile photo.

Worth restating the trade-off plainly: anything baked means updating it later means re-exporting that piece of art, not editing code. The whiteboard is the one exception, built the other way on purpose.

## Technical approach

- **Three.js**, as an explicit, scoped exception to the main site's "no external libraries" rule — this page only.
- Recommend building the room as a **stylized, low-poly 3D scene** using primitive geometry (boxes, planes, cylinders) rather than photorealistic modeling. This is what makes "true 3D" actually achievable without Blender expertise or a custom modeling pipeline, while still being real, camera-navigable 3D rather than a flat illustration. The reference photos inform the aesthetic (colors, composition, mood), not literal geometry.
- If higher visual fidelity than primitives becomes a priority later, a free/CC0 low-poly furniture or office asset pack (glTF format, sources like Kenney.nl-style kits or CC0 Sketchfab/Poly Pizza models) is worth exploring — not a decision that needs to block this doc.
- **Whiteboard text**: built at runtime as a canvas texture generated from a config array, not a static baked image — this is what keeps it editable without touching the art, unlike everything else in the scene.
- **Motion**: `DeviceOrientationEvent.requestPermission()` on iOS Safari requires the explicit tap-triggered prompt already planned. On denial, or on any device without motion support (most Android, all desktop), swipe/drag becomes the look-around input immediately, no permission step.
- **Ball-to-hoop transition**: fully keyframed, timed sequence — no physics engine.
- **Steam animation**: kept lightweight — a small looping sprite or simple particle effect, not a full smoke simulation.

## Deployment

Live now at shruthianand.in directly, or a free Vercel-provided link if pointing the domain here is inconvenient before the main portfolio site exists. Same URL either way gets encoded into the event QR code once decided.

## Responsive behavior

Mobile-first; must work on mobile, tablet, and desktop. Mobile defaults to swipe-left/right unless motion is explicitly allowed. Desktop or any device without motion hardware uses mouse-drag or cursor-parallax. Pixel-perfect fidelity at every breakpoint isn't required — the core loop (see room → click ball → route out) working everywhere is.

## Content still needed

- [ ] LinkedIn profile URL (outstanding since v1)
- [ ] Reference photos of the real office space
- [ ] Confirm final wording for the ID card (draft above) — this one's baked, so lock it before art starts
- [ ] Whiteboard wording can be finalized anytime, including after launch, since it's editable — no rush
- [ ] Any budget/appetite for a paid asset pack, if primitives don't hit the aesthetic bar you want

## Open questions to settle at build time

- Exact angular range for looking around (fully enclosed 360° room vs. a bounded arc facing the desk)
- Whether the MacBook stickers are specific ones or a generic "funny sticker" look
- Whether the mic stand stays purely decorative or eventually hints at something else (audio, a podcast)
