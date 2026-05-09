# resist-scroll

> A Microsoft Edge extension that adds increasing friction to YouTube Shorts navigation — making you earn every scroll.

---

## What it does

Every time you try to swipe to the next (or previous) Short, a counter appears on screen. You have to press the navigation key or button **N times** before the video actually changes. The required presses increase with each Short you navigate to:

| Short # | Presses required |
|---------|-----------------|
| 1st → 2nd | 10 |
| 2nd → 3rd | 20 |
| 3rd → 4th | 30 |
| … | +10 each time |

Holding the key does **nothing** — only discrete, intentional presses count. The goal is to make you aware of mindless scrolling and see how long you can resist.

---

## Preview

A minimal overlay appears on the right side of the screen showing your remaining presses and a colour-shifting progress bar (green → red as you get closer to navigating away).

---

## Installation

This extension is not on the Edge Add-ons store. Load it manually in developer mode:

1. Download or clone this repository
2. Open Microsoft Edge and navigate to `edge://extensions/`
3. Enable **Developer mode** (toggle in the top-left)
4. Click **Load unpacked**
5. Select the folder
6. Open any [YouTube Short](https://www.youtube.com/shorts/) and start resisting

---

## Files

```
resist-scroll/
├── manifest.json   — Extension manifest (Manifest V3)
├── content.js      — Navigation interception and counter logic
├── overlay.css     — On-screen counter UI styles
└── icons/          — Extension icons
```

---

## How it works

- **Keyboard:** `ArrowDown` / `ArrowUp` `keydown` events are silently blocked (preventing hold-repeat). Only `keyup` is counted — one discrete press per physical tap.
- **Buttons:** Clicks on YouTube's on-screen navigation buttons are intercepted the same way.
- **Navigation:** When the counter reaches zero, the extension dispatches its own passthrough event to YouTube's handler, triggering the actual Short change.
- **SPA-aware:** YouTube Shorts is a single-page app. The extension patches the History API and uses a MutationObserver to stay active across navigations without requiring a page reload.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Built with

Built in collaboration with [Claude](https://claude.ai) (Anthropic) — prompted, debugged, and directed by a human who wanted to stop doom-scrolling Shorts.
