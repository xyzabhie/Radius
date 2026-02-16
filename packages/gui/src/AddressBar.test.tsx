import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddressBar } from './components/request/AddressBar'

// Mock Radix UI Select to simplify testing of business logic
vi.mock('./components/ui/select', () => ({
    Select: ({ onValueChange, children }: any) => <div data-testid="select-mock" onClick={() => onValueChange('POST')}>{children}</div>,
    SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
    SelectValue: () => null,
    SelectContent: () => null,
    SelectItem: () => null,
}))

describe('AddressBar Component', () => {
    const defaultProps = {
        method: 'GET',
        url: 'http://localhost:3000',
        onMethodChange: vi.fn(),
        onUrlChange: vi.fn(),
        onSend: vi.fn(),
        onSave: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders correctly with initial props', () => {
        render(<AddressBar {...defaultProps} />)
        expect(screen.getByDisplayValue('http://localhost:3000')).toBeInTheDocument()
        expect(screen.getByText('Send')).toBeInTheDocument()
    })

    it('calls onUrlChange when input changes', async () => {
        render(<AddressBar {...defaultProps} />)
        const input = screen.getByRole('textbox')
        await userEvent.type(input, '/api')
        expect(defaultProps.onUrlChange).toHaveBeenCalled()
    })

    it('calls onSend when send button is clicked', async () => {
        render(<AddressBar {...defaultProps} />)
        const sendButton = screen.getByText('Send')
        await userEvent.click(sendButton)
        expect(defaultProps.onSend).toHaveBeenCalled()
    })

    it('changes method on dropdown selection', async () => {
        render(<AddressBar {...defaultProps} />)
        // Click the mocked select to trigger value change
        const select = screen.getByTestId('select-mock')
        await userEvent.click(select)
        expect(defaultProps.onMethodChange).toHaveBeenCalledWith('POST')
    })
})
