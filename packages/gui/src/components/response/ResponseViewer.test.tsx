import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResponseViewer } from './ResponseViewer';
import { RadiusResponse } from '@radius/core';
import '@testing-library/jest-dom';

const mockResponse: RadiusResponse = {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: '{"message": "success"}',
    json: { message: "success" },
    timing: { total: 120 },
    request: { method: 'GET', url: 'https://api.example.com', headers: {} }
};

describe('ResponseViewer', () => {
    it('renders loading state correctly', () => {
        render(<ResponseViewer response={null} loading={true} error={null} viewMode="pretty" lineWrap={true} />);
        expect(screen.getByText(/Sending Request/i)).toBeInTheDocument();
    });

    it('renders empty state professionally', () => {
        render(<ResponseViewer response={null} loading={false} error={null} viewMode="pretty" lineWrap={true} />);
        expect(screen.getByText(/No response available/i)).toBeInTheDocument();
        expect(screen.queryByText('👋')).not.toBeInTheDocument(); // Ensure no emojis
    });

    it('renders body tab when response present', () => {
        render(<ResponseViewer response={mockResponse} loading={false} error={null} viewMode="pretty" lineWrap={true} />);
        // Body and Headers tabs should be present
        expect(screen.getByText('Body')).toBeTruthy();
        expect(screen.getByText(/Headers/)).toBeTruthy();
    });
});
