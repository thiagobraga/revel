import type { KeyboardChord } from '../types/domain';
export const DEFAULT_BINDINGS = { save: 'mod+s', cancel: 'escape' };
export function matchesShortcut(event: KeyboardChord, chord: string, editable: boolean) {
    if (editable)
        return false;
    const parts = chord.toLowerCase().split('+');
    const key = parts.at(-1);
    const mod = parts.includes('mod');
    return event.key.toLowerCase() === key && (event.ctrlKey || event.metaKey) === mod && event.altKey === parts.includes('alt') && event.shiftKey === parts.includes('shift');
}
