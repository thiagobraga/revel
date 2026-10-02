import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
it('uses a semantic, keyboard-focusable button and forwards events', () => {
    let calls = 0;
    render(<Button onClick={() => calls++}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(calls).toBe(1);
});
