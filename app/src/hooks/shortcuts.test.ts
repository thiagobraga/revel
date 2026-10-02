import { it, expect } from 'vitest';
import fc from 'fast-check';
import { matchesShortcut } from './shortcuts';
it('matches modifiers exactly and ignores editable inputs', () => {
    expect(matchesShortcut({ key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, 'mod+s', false)).toBe(true);
    expect(matchesShortcut({ key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, 'mod+s', true)).toBe(false);
    expect(matchesShortcut({ key: 's', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false }, 'mod+s', false)).toBe(false);
    expect(matchesShortcut({ key: 's', ctrlKey: false, metaKey: true, altKey: false, shiftKey: true }, 'mod+shift+s', false)).toBe(true);
    expect(matchesShortcut({ key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, 'escape', false)).toBe(true);
});
it('never matches a different key', () => fc.assert(fc.property(fc.string().filter(k => k.toLowerCase() !== 's'), key => !matchesShortcut({ key, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, 'mod+s', false))));
