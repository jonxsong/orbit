export function retryDelay(attempt: number, random = Math.random()): number {
  const cappedAttempt = Math.min(Math.max(attempt, 0), 8);
  const ceiling = Math.min(300_000, 1_000 * 2 ** cappedAttempt);
  return Math.floor(random * ceiling);
}

