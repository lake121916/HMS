import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import LoginPage from '../pages/LoginPage';

// ── Mock AuthContext ──────────────────────────────────────────────────────────
const mockLogin = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    loading: false,
    logout: vi.fn(),
  }),
}));

// ── Mock react-router-dom navigate ───────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the login form with email and password fields', () => {
      renderLogin();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders the hospital branding text', () => {
      renderLogin();
      // The heading is in the left panel - accessible
      expect(screen.getByText(/Alem Ketema Enat/)).toBeInTheDocument();
    });

    it('renders the login form with accessible label', () => {
      renderLogin();
      expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('allows typing in the email field', async () => {
      renderLogin();
      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'doctor@hospital.com');
      expect(emailInput).toHaveValue('doctor@hospital.com');
    });

    it('allows typing in the password field', async () => {
      renderLogin();
      const passwordInput = screen.getByLabelText(/^password$/i);
      await userEvent.type(passwordInput, 'SecurePass123');
      expect(passwordInput).toHaveValue('SecurePass123');
    });

    it('toggles password visibility when eye button is clicked', async () => {
      renderLogin();
      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      // Click toggle button
      const toggleButton = screen.getByRole('button', { name: '' });
      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Form Submission', () => {
    it('calls login with email and password on submit', async () => {
      mockLogin.mockResolvedValueOnce({ id: 1, email: 'admin@hospital.com', role: 'admin' });
      renderLogin();

      await userEvent.type(screen.getByLabelText(/email address/i), 'admin@hospital.com');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'Password1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockLogin).toHaveBeenCalledWith('admin@hospital.com', 'Password1!');
    });

    it('navigates to /dashboard after admin login', async () => {
      mockLogin.mockResolvedValueOnce({ id: 1, email: 'admin@hospital.com', role: 'admin' });
      renderLogin();

      await userEvent.type(screen.getByLabelText(/email address/i), 'admin@hospital.com');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'Password1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
    });

    it('navigates to /reception after receptionist login', async () => {
      mockLogin.mockResolvedValueOnce({ id: 5, email: 'reception@hospital.com', role: 'receptionist' });
      renderLogin();

      await userEvent.type(screen.getByLabelText(/email address/i), 'reception@hospital.com');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'Password1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/reception'));
    });

    it('displays an error alert if login fails', async () => {
      mockLogin.mockRejectedValueOnce({
        response: { data: { message: 'Invalid email or password' } }
      });
      renderLogin();

      await userEvent.type(screen.getByLabelText(/email address/i), 'wrong@hospital.com');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'WrongPass!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
      );
    });

    it('shows loading state while submitting', async () => {
      // Never resolves so we can inspect the loading state
      mockLogin.mockReturnValueOnce(new Promise(() => {}));
      renderLogin();

      await userEvent.type(screen.getByLabelText(/email address/i), 'admin@hospital.com');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'Password1!');
      fireEvent.submit(screen.getByRole('form', { name: /login form/i }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
      );
    });
  });
});
