/** Codex motion detail sheet. Easing A is the shared curve. Presses use ease-out. */

export const EASE_A: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SHEET_IN_S = 0.22;
export const SHEET_OUT_S = 0.18;
export const BACKDROP_IN_S = 0.2;
export const CROSS_FADE_S = 0.18;
export const PULSE_S = 1.8;
export const TAB_S = 0.16;
export const BANNER_S = 0.16;
export const CARD_FADE_S = 0.16;
export const CARD_STAGGER_S = 0.04;
export const FAB_PRESS_S = 0.1;
export const FAB_RELEASE_S = 0.16;

export const WAVE_HEIGHTS = [8, 14, 10, 18, 12, 16, 9] as const;

/** Design pass 2. Tab content fade 220ms, nav indicator spring, row stagger 30ms. */
export const TAB_FADE_S = 0.22;
export const ROW_STAGGER_S = 0.03;
export const NAV_SPRING = { type: "spring", stiffness: 400, damping: 32 } as const;
export const SHEET_SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;
export const VOICE_BARS = [0.35, 0.6, 0.85, 0.5, 1, 0.55, 0.8, 0.45, 0.3] as const;
