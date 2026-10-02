import { it, expect } from 'vitest';
import { runOptimistic } from './optimistic';
it('applies once and reverts only on failure', async () => {
    let value = 0;
    expect(await runOptimistic({ apply: () => value = 1, revert: () => value = 0, request: async () => 42 })).toBe(42);
    expect(value).toBe(1);
    await expect(runOptimistic({ apply: () => value = 2, revert: () => value = 1, request: async () => {
            throw new Error('network');
        } })).rejects.toThrow('network');
    expect(value).toBe(1);
});
