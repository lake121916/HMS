import { render, screen } from '@testing-library/react';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';

// A child that throws on render
const BrokenComponent: React.FC = () => {
  throw new Error('Test render crash');
};

// Suppress console.error noise during this test
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary Component', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>Child content is healthy</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content is healthy')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });

  it('displays the error message in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Test render crash/)).toBeInTheDocument();
  });

  it('renders a custom fallback when the fallback prop is provided', () => {
    render(
      <ErrorBoundary fallback={<p>Custom error view</p>}>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error view')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});
