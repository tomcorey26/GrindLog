import { describe, test, expect } from 'vitest';
import { CONGRATS_MESSAGES, getRandomCongratsMessage } from './congrats-messages';

describe('congrats messages', () => {
  test('has at least 8 messages', () => {
    expect(CONGRATS_MESSAGES.length).toBeGreaterThanOrEqual(8);
  });

  test('all messages are non-empty strings', () => {
    for (const msg of CONGRATS_MESSAGES) {
      expect(typeof msg).toBe('string');
      expect(msg.trim().length).toBeGreaterThan(0);
    }
  });

  test('getRandomCongratsMessage returns a message from the list', () => {
    const msg = getRandomCongratsMessage();
    expect(CONGRATS_MESSAGES).toContain(msg);
  });

  test('getRandomCongratsMessage returns different messages over many calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomCongratsMessage());
    }
    // Should get at least 2 different messages in 50 tries
    expect(results.size).toBeGreaterThan(1);
  });
});
