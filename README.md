# Tend demo

A clickable, voice-first networking app prototype built with plain HTML, CSS, and JavaScript. Open `index.html` locally or publish the repository with GitHub Pages. All contact and conversation details are fictional. The waitlist form is the only feature that sends data.

## Set up the waitlist

1. Create a Formspree form and copy its endpoint URL.
2. Open `config.js`.
3. Replace `PASTE_FORMSPREE_URL_HERE` with the Formspree URL.
4. Submit a test address after publishing. Until the endpoint is set, the form will show a friendly not connected message and will not send or save the address.

The form sends email, optional school, and optional graduation year as JSON. Email addresses are never written to local storage or the page.

## Change the sample data

Open `data.js` to edit Jordan, the fictional contacts, events, follow-ups, reminders, and weekly digest. Keep contact IDs unique because the demo uses them for navigation.

## Change colors and text

- Colors and responsive layout are near the top of `styles.css` in the `:root` variables.
- Screen copy and interactions are in `app.js`.
- The desktop tagline, waitlist labels, and page structure are in `index.html`.
- The waitlist privacy notice and contact placeholder are in `privacy.html`.

## Publish with GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings**, then **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose the `main` branch and `/(root)` folder, then select **Save**.
5. Wait for GitHub Pages to publish, then open the site link shown on the Pages settings screen.

All assets use relative paths, so the site works from a GitHub Pages project sub-path. No build step or package install is needed.

## What to try first

1. Open **Home** and tap the purple capture button. Let the sample voice capture finish, then save Alex’s card.
2. Open the new card and try **Draft message** and **Set reminder**.
3. Open **Events**, start Fall Career Fair mode, capture a few people, then end the event and draft thank-you notes.
4. Review a follow-up, edit the draft, tap **Send**, then confirm the simulated handoff.
5. Open **Settings** and show the weekly digest.
6. Test the waitlist after adding your Formspree endpoint.

## Demo boundaries

The microphone, camera, AI, login, notifications, send actions, export, and delete controls are simulated. No tracking scripts, analytics, or cookies are used. The waitlist email is sent only to the configured form endpoint.
