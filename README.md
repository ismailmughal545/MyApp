# Create Panel (Electric-app)

Offline-capable drawing & text editor PWA (shapes, English/Urdu text, PNG/JPG export, photos from your gallery, project save/load).

- Open `index.html` through any static HTTP server (service worker needs http/https).
- Projects are stored in the browser (`localStorage`); use File → Save project to download a `.json` copy.

## Main toolbar and MORE

Breaker, Lamp, Magnetic Contactor, Overload, Timer, Meter, Solar Panel, Battery, Terminal, Relay, and Motor are directly accessible on the horizontal scrolling toolbar. **MORE** is also available at the end of the toolbar and opens a catalog containing Solar Panel, Battery, Terminal, Relay, and Motor. The same PNG libraries can therefore be opened either directly from the toolbar or from MORE.

Every listed category supports up to 1000 slots. Each slot accepts a **PNG or JPG** (`.png`, `.jpg`, `.jpeg`, also `.webp`) — use whichever you like, just keep the same name pattern. Only files that actually exist are displayed.

| Category | Folder | Filename pattern (.png / .jpg / .jpeg) |
|---|---|---|
| Breaker | `breakers/all/` | `breaker-001.png` … `breaker-1000.png` |
| Magnetic Contactor | `contactors/all/` | `contactor-001.png` … `contactor-1000.png` |
| Overload | `overloads/all/` | `overload-001.png` … `overload-1000.png` |
| Timer | `timers/all/` | `timer-001.png` … `timer-1000.png` |
| Meter | `meters/all/` | `meter-001.png` … `meter-1000.png` |
| Solar Panel | `solars/all/` | `solar-001.png` … `solar-1000.png` |
| Battery | `batteries/all/` | `battery-001.png` … `battery-1000.png` |
| Terminal | `terminals/all/` | `terminal-001.png` … `terminal-1000.png` |
| Relay | `relays/all/` | `relay-001.png` … `relay-1000.png` |
| Motor | `motors/all/` | `motor-001.png` … `motor-1000.png` |

Add your own PNG or JPG files to the matching folders using the exact base names above (e.g. `breaker-001.jpg` works the same as `breaker-001.png`). The app does not create sample images automatically.
