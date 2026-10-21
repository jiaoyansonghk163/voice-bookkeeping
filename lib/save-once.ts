/** One successful persist per voice or confirm session. A second claim does not write again. */
export function createSaveGate() {
  const claimed = new Set<string>();
  return {
    claim(sessionId: string): boolean {
      if (!sessionId || claimed.has(sessionId)) return false;
      claimed.add(sessionId);
      return true;
    },
  };
}
