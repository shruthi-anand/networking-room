# Networking Room project rules

This is a standalone interactive page for Shruthi Anand's networking room. Three.js is an explicit exception to the usual no-external-library rule, and that exception is scoped to this project only. Load it from the CDN import map in `index.html`; do not add npm, a bundler, or a build step.

## Content and art rules

- The whiteboard text is config-driven and generated at runtime from `js/config.js`. It is not baked artwork.
- Every other text-bearing object in the room is intended to be a baked image texture. Keep that distinction clear when adding assets.
- Ball and hoop motion is keyframed and scripted. Never add a physics engine for the throw sequence.
- Keep the experience mobile-first. Camera control must support tilt when permission is granted and swipe/drag when it is unavailable or denied.

## Working style

- Explain every change in plain English.
- Work on one feature per prompt.
- Commit after every working step.
- Validate the page in a browser after changes; because this is a static ES-module site, use a local HTTP server rather than opening `index.html` directly.
- Keep event configuration, destination URLs, and editable scene copy in `js/config.js`.
