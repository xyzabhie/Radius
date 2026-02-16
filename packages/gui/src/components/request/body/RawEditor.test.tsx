import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RawEditor } from './RawEditor';

// Mock CodeMirror
vi.mock('@uiw/react-codemirror', () => ({
    default: ({ value, onChange, className }: any) => (
        <textarea
            data-testid="codemirror-mock"
            className={className}
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
        />
    )
}));

describe('RawEditor', () => {
    const mockOnChange = vi.fn();

    it('renders content correctly', () => {
        const content = '{"foo": "bar"}';
        render(<RawEditor content={content} onChange={mockOnChange} mode="json" />);

        const editor = screen.getByTestId('codemirror-mock');
        expect(editor).toHaveValue(content);
    });

    it('renders in text mode', () => {
        const content = 'Just plain text';
        render(<RawEditor content={content} onChange={mockOnChange} mode="text" />);

        const editor = screen.getByTestId('codemirror-mock');
        expect(editor).toHaveValue(content);
    });
});
