/// <reference types="jest" />

import { retryDelay } from './backoff';

describe('retryDelay', () => {
  it('uses bounded full jitter', () => {
    expect(retryDelay(0, 0.5)).toBe(500);
    expect(retryDelay(4, 0.5)).toBe(8000);
    expect(retryDelay(99, 1)).toBeLessThanOrEqual(300000);
  });
});

