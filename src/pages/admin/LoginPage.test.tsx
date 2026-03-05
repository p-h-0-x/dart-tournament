import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAdmin: false,
    login: mockLogin,
    logout: vi.fn(),
    user: null,
    loading: false,
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('renders login form', () => {
    renderPage();
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText('Email'), 'admin@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password123');
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid'));
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText('Email'), 'bad@test.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('navigates to admin on successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText('Email'), 'admin@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/tournaments');
  });
});
