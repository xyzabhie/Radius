import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GraphQLEditor } from './GraphQLEditor';

// Mock CodeMirror to avoid heavy rendering in tests
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

describe('GraphQLEditor', () => {
    const mockOnChange = vi.fn();

    it('parses initial content correctly', () => {
        const initialContent = JSON.stringify({
            query: 'query { me { id } }',
            variables: { id: 1 }
        });

        render(<GraphQLEditor content={initialContent} onChange={mockOnChange} />);

        const editors = screen.getAllByTestId('codemirror-mock');
        expect(editors).toHaveLength(2); // Query + Variables

        expect(editors[0]).toHaveValue('query { me { id } }');
        expect(editors[1]).toHaveValue(JSON.stringify({ id: 1 }, null, 2));
    });

    it('handles invalid JSON content gracefully by treating it as query', () => {
        const rawQuery = 'query { simple }';
        render(<GraphQLEditor content={rawQuery} onChange={mockOnChange} />);

        const editors = screen.getAllByTestId('codemirror-mock');
        expect(editors[0]).toHaveValue(rawQuery);
    });
});
