import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import userEvent from '@testing-library/user-event';

// Mock the auth store
vi.mock('../lib/auth', () => ({
  useAuthStore: vi.fn(() => ({
    login: vi.fn(),
  })),
}));

describe('LoginPage', () => {
  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  };

  it('should render login form', () => {
    renderLoginPage();
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show error for empty username', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    
    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);
    
    // Form validation should prevent submission
    expect(screen.getByLabelText(/username/i)).toBeInvalid();
  });

  it('should show error for empty password', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    
    const usernameInput = screen.getByLabelText(/username/i);
    await user.type(usernameInput, 'testuser');
    
    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);
    
    // Form validation should prevent submission
    expect(screen.getByLabelText(/password/i)).toBeInvalid();
  });

  it('should accept input in username and password fields', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should display Home Control title', () => {
    renderLoginPage();
    
    expect(screen.getByText(/home control/i)).toBeInTheDocument();
  });
});
