# 璃记 · 语音记账

A self-contained web prototype of a Chinese voice bookkeeping app. Speak an expense like 「午饭三十八块」 and the screen walks through capture, a transcript, an automatic category, and a ledger entry.

The interface is in Simplified Chinese. Amounts are fictional sample data for the demo. No account linking, no API keys, and no microphone permission are required.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test        # Chinese amount parser
npm run build   # production build
```

Chinese text uses the system font stack (PingFang SC, Noto Sans CJK SC, Microsoft YaHei). On Linux, install a CJK face if glyphs are missing, for example `fonts-noto-cjk`.

## Screens

- **账本** — today’s spend and the recent ledger
- **语音记账** — bottom-sheet capture, transcript, confirm, success
- **分类** — this month’s category breakdown
- **明细** — one transaction, including the original phrase

Direct links: `/`, `/categories`, `/tx/sample-1`.

The ledger is kept in `localStorage` (`liji.ledger.v1`). **恢复示例数据** on the category screen reloads the fictional sample set.

## Voice, on purpose, is mocked

`lib/asr.ts` defines a `SpeechRecognizer`. The app uses `MockSpeechRecognizer`, which waits briefly and then returns one of the sample phrases (or the phrase chip you tapped). `parseTranscript()` in `lib/parse-transcript.ts` turns that sentence into an amount, a title, and a category.

To try a real engine later, implement `SpeechRecognizer` and return it from `createSpeechRecognizer()`. A `WebSpeechRecognizer` skeleton is included and is not selected by default, so the demo never prompts for a microphone or sends audio anywhere.

## Design

Quiet on purpose. A soft system wallpaper, one frosted grouped list, and a sheet that springs up from the bottom. Type follows an iOS scale: a large title, a much larger amount, and secondary labels in a quieter gray. The microphone and the confirm button use system blue. Motion is limited to the sheet, the listening pulse, the success check, and a newly inserted row.
