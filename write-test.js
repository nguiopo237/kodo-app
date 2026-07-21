const fs = require('fs');
const content = `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockShowError = vi.fn();
const mockSuccess = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      user: null,
      loading: false,
      isAdmin: false,
      isVendeur: false,
      hasPermission: () => true,
    }),
  };
});

vi.mock('../context/NotificationContext', async () => {
  const actual = await vi.importActual('../context/NotificationContext');
  return {
    ...actual,
    useNotification: () => ({
      error: mockShowError,
      success: mockSuccess,
      warning: vi.fn(),
      info: vi.fn(),
    }),
  };
});

const wrapper = ({ children }) => React.createElement(MemoryRouter, { initialEntries: ['/login'] }, children);

const LoginPromise = import('./Login').then(m => m.default);

const setupTest = () => {
  const user = userEvent.setup();
  render(React.createElement(Login, null), { wrapper });
  return { user };
};
`;

fs.writeFileSync('src/pages/Login.test.jsx', content, 'utf8');
console.log('WRITTEN:', content.length);
