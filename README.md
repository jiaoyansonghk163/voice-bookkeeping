# 语音记账

A portrait web prototype of a Chinese voice bookkeeping app. Say an expense like 「午饭三十八块」 and the screen walks through listening, a transcript, a category, and a saved ledger row.

The interface is Simplified Chinese. Amounts are fictional **示例数据**. No account linking, no API keys, and no microphone permission are required.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On a phone, add it to the home screen: the app is a standalone PWA (`viewport-fit=cover`, dark `theme_color`).

```bash
npm test        # Chinese amount parser
npm run build   # production build
```

Chinese text uses the system font stack (PingFang SC, Noto Sans CJK SC). On Linux, install a CJK face if glyphs are missing, for example `fonts-noto-cjk`.

## Screens

- **账单** — this month, today, budget left, a 7-day sparkline, and recent rows
- **语音记账** — bottom sheet: listening, then confirm, then the new row
- **统计** — category split of the current list
- **预算** — remaining budget for the sample month
- **我的** — where the ledger is labeled 示例数据, with **恢复示例数据**
- **明细** — one transaction, including the original phrase

Direct links: `/`, `/stats`, `/budget`, `/me`, `/tx/sample-1`.

The ledger is kept in `localStorage` (`liji.ledger.v2`).

The home headlines (本月 ¥3,286、今日 ¥126 / 4 笔、预算剩余 ¥1,714、近 7 天日均 ¥108) are illustrative for the sample month. The recent list is the visible sample. A confirmed voice entry is prepended to that list and added into the headlines.

## Voice, on purpose, is mocked

`lib/asr.ts` defines a `SpeechRecognizer`. The app uses `MockSpeechRecognizer`, which waits briefly and then returns one of the sample phrases, starting with 「午饭三十八块」. `parseTranscript()` in `lib/parse-transcript.ts` turns that sentence into an amount, a title, and a category.

The listening sheet stays open until **完成** or **停止**. **确认记账** writes the row. **重新说一遍** runs the mock again. The demo confirm step shows **今天 12:30**, matching the sample noon entry.

To try a real engine later, implement `SpeechRecognizer` and return it from `createSpeechRecognizer()`. A `WebSpeechRecognizer` skeleton is included and is not selected by default, so the demo never prompts for a microphone or sends audio anywhere.

## Design

Dark, minimal, portrait. The page background is `#0b1224` with soft blue, violet, and cyan glows. Frosted glass (`blur(16px)`, `saturate(1.4)`) is only on the header, the KPI cards, the tab bar, and the voice sheets. The chart and the transaction list sit on an opaque navy panel. The accent runs from `#22d3ee` to `#3b82f6`. Sheets, the backdrop, and the cards move in 200–300ms with `cubic-bezier(.22, 1, .36, 1)`, and that motion is removed when `prefers-reduced-motion` is set.
