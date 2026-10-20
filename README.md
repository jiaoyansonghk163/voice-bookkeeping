# 语音记账

A portrait web app for Chinese voice bookkeeping. Say an expense like 「午饭三十八块」, or type it, and the screen walks through a transcript, a category, and a saved row.

The interface is Simplified Chinese. Bills stay on this device. There is no account linking, no analytics, and no app server. **示例数据** on 我的 is an optional set of fictional rows.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On a phone, add it to the home screen: the app is a standalone PWA (`viewport-fit=cover`, light `theme_color`).

```bash
npm test        # Chinese amount parser
npm run build   # static export in out/
```

## Deploy to Cloudflare Pages

The production build is a fully static export. There is no Node server to run.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `out` |
| Node.js version | `22` (see `.nvmrc` and `engines.node`) |

`next.config.ts` sets `output: 'export'`. The build then writes `out/sw.js`, which precaches that export. Paths are root-absolute (`/manifest.webmanifest`, `/icon-192.png`, `/apple-touch-icon.png`, `/sw.js`), which matches a site served from the domain root.

`out/_redirects` sends unknown paths such as a voice entry's `/tx/<id>` back to `index.html` with status 200. Pages serves real files first, so `/_next`, the manifest, the icons, and the service worker are not rewritten. Known screens (`/`, `/stats`, `/budget`, `/me`, `/all`, `/tx/sample-1` … `sample-5`) are also real HTML files.

Chinese text uses the system font stack (PingFang SC, Noto Sans CJK SC). On Linux, install a CJK face if glyphs are missing, for example `fonts-noto-cjk`.

## Screens

- **账单** — this month, today, budget left, a 7-day sparkline, and recent rows, all from bills stored on the device. An empty ledger shows zeros.
- **语音记账** — the same listening sheet, then confirm. If recognition is missing or offline, the sheet asks you to type the sentence instead.
- **统计** — category split of the stored bills
- **预算** — a monthly budget you set on this device
- **我的** — export and import `语音记账.json`, and the optional **载入示例数据** toggle
- **明细** — one transaction, including the original phrase

Direct links: `/`, `/stats`, `/budget`, `/me`, `/tx/sample-1` (the sample id exists only after you load 示例数据).

## Data stays on the device

Bills and the monthly budget are stored in IndexedDB (`voice-ledger`). If IndexedDB is blocked, the same record is kept in `localStorage` (`voice-ledger.v1`). Nothing is sent to a backend. A reload keeps the rows. **导出账单** downloads a JSON file; **导入账单** replaces the on-device ledger with that file. The app does not load analytics or any other third-party script.

After the first visit to the deployed site, `sw.js` has precached the static files. Opening the app and saving a typed bill then works with no network. Installing it from the browser’s “Add to Home Screen” uses the manifest (`display: standalone`, light `theme_color`).

The worker caches the extensionless URLs Cloudflare Pages serves (`/`, `/stats`, `/tx/sample-1`, and so on), not the `.html` files. Pages redirects those `.html` paths with 308, and Safari refuses a service-worker response whose `redirected` flag is set. A new cache name drops the broken cache on the next visit.

## Voice

`parseTranscript()` in `lib/parse-transcript.ts` is a rule-based parser that stays on the device. One sentence can become several bills when it contains several amounts (for example 「早饭花了¥50中午吃饭花了¥30然后晚上吃饭花了60」). Each bill has a 大类, a 小类, a short note, and an amount. The listening sheet stays up until **完成** or **停止**, then one confirm step saves every row. Older bills without a 小类 pick up the 大类 name. 购物 has no 小类, so a legacy 「日用」 category or 购物 · 日用 becomes plain 购物.

Where the browser exposes the Web Speech API, the app calls it with `lang` `zh-CN` and shows the live transcript in the same sheet. The page itself does not upload audio. The browser may:

- **Android Chrome** sends the audio to Google’s speech service by default, so recognition needs a network. Chrome’s on-device flag (`processLocally`) is not available in Chrome for Android; this app uses it only when the browser reports that a zh-CN pack is already on the device (desktop Chrome 139 and newer). Otherwise Android Chrome is the Google service, and offline it falls back to typing.
- **iPhone Safari** (and other iOS browsers, which use WebKit) has `webkitSpeechRecognition` since iOS 14.5. That path is Apple’s dictation. Whether the audio stays on the phone is the device’s Keyboard / Dictation setting, not something the page can force. Safari does not support `processLocally`. If the phone is offline, or recognition errors, the sheet switches to typing. Dictation that is set to use Apple’s servers will send audio to Apple.

Firefox does not ship recognition enabled. There the sheet is the text field from the start. Typing 「午饭三十八」 uses the same parser and the same confirm sheet.

## Design

Light, portrait card dashboard. The page is near-white (`#f7f8fa`) with a faint teal wash at the top. Summary figures sit on white cards (20px radius, soft shadow, no border) in a two-column grid. Spend amounts are purple and remaining budget is green. The 7-day chart and the bill list are full-width white cards, and each row uses a pale tinted icon tile. The confirm sheet is an opaque white card over a light dim. Motion is 200–300ms with `cubic-bezier(.22, 1, .36, 1)`, and that motion is removed when `prefers-reduced-motion` is set.
