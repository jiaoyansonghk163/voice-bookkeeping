export const DICTATION_KEY = "shanji.keyboardDictation";

type Store = Pick<Storage, "getItem" | "setItem">;

function defaultStore(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** 「用键盘听写」: default OFF. */
export function readKeyboardDictation(store: Store | null = defaultStore()): boolean {
  try {
    return store?.getItem(DICTATION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeKeyboardDictation(on: boolean, store: Store | null = defaultStore()): void {
  try {
    store?.setItem(DICTATION_KEY, on ? "1" : "0");
  } catch {
    /* a setting is not worth a warning */
  }
}
