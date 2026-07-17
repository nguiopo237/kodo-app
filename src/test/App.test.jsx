import { describe, it, expect } from 'vitest';

// Test basique pour vérifier que Vitest fonctionne
describe('KodoMarket - Tests de base', () => {
  it('les maths fonctionnent', () => {
    expect(1 + 1).toBe(2);
  });

  it('les objets sont corrects', () => {
    const user = { nom: 'Admin', role: 'admin' };
    expect(user.role).toBe('admin');
    expect(user).toHaveProperty('nom');
  });

  it('les chaînes sont valides', () => {
    expect('KodoMarket').toMatch(/Kodo/);
  });
});
