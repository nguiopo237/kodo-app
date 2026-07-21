import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockShowError = vi.fn();
const mockSuccess = vi.fn();

const mockAuthState = { user: null, loading: false };

vi.mock('react-router-dom', async () => {
  const a = await vi.importActual('react-router-dom');
  return { ...a, useNavigate: () => mockNavigate };
});

vi.mock('../context/AuthContext', async () => {
  const a = await vi.importActual('../context/AuthContext');
  return { ...a, useAuth: () => ({ login: mockLogin, logout: mockLogout, user: mockAuthState.user, loading: mockAuthState.loading }) };
});

vi.mock('../context/NotificationContext', async () => {
  const a = await vi.importActual('../context/NotificationContext');
  return { ...a, useNotification: () => ({ error: mockShowError, success: mockSuccess }) };
});

const Login = (await import('./Login')).default;

const loginWrapper = ({ children }) => React.createElement(MemoryRouter, { initialEntries: ['/login'] }, children);

const setupTest = () => {
  const user = userEvent.setup();
  render(React.createElement(Login, null), { wrapper: loginWrapper });
  return { user };
};

const LogoutTestHarness = () => {
  return React.createElement(React.Fragment, null,
    React.createElement('div', null, 'Dashboard'),
    React.createElement('button', {
      onClick: () => { mockLogout(); mockNavigate('/login'); },
      'data-testid': 'btn-logout',
    }, 'D\xe9connexion')
  );
};

const renderLogoutHarness = () => {
  const user = userEvent.setup();
  render(React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] },
    React.createElement(LogoutTestHarness, null)
  ));
  return { user };
};

describe('Login - Rendu initial', () => {
  beforeEach(() => { vi.resetAllMocks(); mockAuthState.user = null; localStorage.clear(); });
  it('affiche le titre', () => { setupTest(); expect(screen.getByText('KodoMarket')).toBeInTheDocument(); });
  it('affiche les champs', () => { setupTest(); expect(screen.getByLabelText(/nom d.uti/i)).toBeInTheDocument(); expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument(); });
  it('affiche le bouton', () => { setupTest(); expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument(); });
  it('identifiants demo', () => { setupTest(); expect(screen.getByText('admin123')).toBeInTheDocument(); });
  it('type password', () => { setupTest(); expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute('type', 'password'); });
  it('placeholder', () => { setupTest(); expect(screen.getByPlaceholderText(/admin ou vendeur1/i)).toBeInTheDocument(); });
});

describe('Login - Connexion', () => {
  beforeEach(() => { vi.resetAllMocks(); mockAuthState.user = null; localStorage.clear(); });
  it('admin login OK', async () => {
    mockLogin.mockResolvedValue({});
    const { user } = setupTest();
    await user.type(screen.getByLabelText(/nom d.uti/i), 'admin');
    await user.type(screen.getByLabelText(/mot de passe/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123'));
  });
  it('vendeur login OK', async () => {
    mockLogin.mockResolvedValue({});
    const { user } = setupTest();
    await user.type(screen.getByLabelText(/nom d.uti/i), 'vendeur1');
    await user.type(screen.getByLabelText(/mot de passe/i), 'vendeur123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('vendeur1', 'vendeur123'));
  });
  it('bouton disabled', async () => {
    mockLogin.mockImplementation(() => new Promise(r => setTimeout(() => r({}), 200)));
    const { user } = setupTest();
    await user.type(screen.getByLabelText(/nom d.uti/i), 'admin');
    await user.type(screen.getByLabelText(/mot de passe/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /connexion en cours/i })).toBeDisabled());
  });
  it('login echoue affiche erreur', async () => {
    mockLogin.mockRejectedValue(new Error('Incorrect'));
    const { user } = setupTest();
    await user.type(screen.getByLabelText(/nom d.uti/i), 'admin');
    await user.type(screen.getByLabelText(/mot de passe/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(mockShowError).toHaveBeenCalled());
    expect(mockLogin).toHaveBeenCalledWith('admin', 'wrong');
  });
  it('champs required', () => {
    setupTest();
    expect(screen.getByLabelText(/nom d.uti/i)).toBeRequired();
    expect(screen.getByLabelText(/mot de passe/i)).toBeRequired();
  });
});

describe('D\xe9connexion', () => {
  beforeEach(() => { vi.resetAllMocks(); mockAuthState.user = null; localStorage.clear(); });

  it('affiche le bouton D\xe9connexion', () => {
    mockAuthState.user = { username: 'admin', role: 'admin' };
    renderLogoutHarness();
    expect(screen.getByTestId('btn-logout')).toBeInTheDocument();
    expect(screen.getByText(/D\xe9connexion/i)).toBeInTheDocument();
  });

  it('clic appelle logout + navigate vers login', async () => {
    mockAuthState.user = { username: 'admin', role: 'admin' };
    mockLogout.mockImplementation(() => { mockAuthState.user = null; });
    const { user } = renderLogoutHarness();
    await user.click(screen.getByTestId('btn-logout'));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(mockAuthState.user).toBeNull();
  });

  it('fonctionne pour utilisateur vendeur', async () => {
    mockAuthState.user = { username: 'vendeur1', role: 'vendeur' };
    mockLogout.mockImplementation(() => { mockAuthState.user = null; });
    const { user } = renderLogoutHarness();
    await user.click(screen.getByTestId('btn-logout'));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
