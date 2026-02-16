import { render, screen, fireEvent } from '@testing-library/react';
import { RequestEditor } from './RequestEditor';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('react-resizable-panels', () => ({
    Group: ({ children }: any) => <div>{children}</div>,
    Panel: ({ children }: any) => <div>{children}</div>,
    Separator: () => <div>Separator</div>,
}));

// Mock Store
const mockExecuteRequest = vi.fn();
const mockUpdateRequest = vi.fn();

vi.mock('../../stores/requestStore', () => ({
    useRequestStore: () => ({
        requests: {
            'test-tab': {
                id: 'test-tab',
                method: 'GET',
                url: 'https://test.com',
                params: [],
                headers: [],
                body: '',
                bodyType: 'none',
                response: null
            }
        },
        initializeRequest: vi.fn(),
        updateRequest: mockUpdateRequest,
        executeRequest: mockExecuteRequest,
    })
}));

describe('RequestEditor', () => {
    it('renders and handles Send click', () => {
        render(<RequestEditor tabId="test-tab" />);

        // 1. Verify Render
        expect(screen.getByTestId('request-editor')).toBeTruthy();

        // 2. Click Send
        const sendBtn = screen.getByText('Send');
        fireEvent.click(sendBtn);

        // 3. Verify Action
        expect(mockExecuteRequest).toHaveBeenCalledWith('test-tab');
    });
});
