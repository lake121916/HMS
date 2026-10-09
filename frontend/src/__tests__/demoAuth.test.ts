import { describe, expect, it } from 'vitest';
import { getDemoAuthUser } from '../contexts/AuthContext';

describe('demo auth', () => {
  it('returns a nurse user for the demo credentials', () => {
    const user = getDemoAuthUser('nurse@gmail.com', 'Hospital@2024');

    expect(user).not.toBeNull();
    expect(user?.role).toBe('nurse');
    expect(user?.firstName).toBe('Demo');
    expect(user?.lastName).toBe('Nurse');
  });
});
