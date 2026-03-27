const mockSignInWithPassword = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  })),
}));

import { authService } from '@/services/supabase';

describe('authService.signIn', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSignInWithPassword.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns user and null error on success', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'u1',
          email: 'a@school.edu',
          user_metadata: { full_name: 'Test', role: 'ambassador' },
        },
      },
      error: null,
    });

    const result = await authService.signIn('a@school.edu', 'secret');

    expect(result.error).toBeNull();
    expect(result.user).not.toBeNull();
    expect(result.user?.email).toBe('a@school.edu');
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'a@school.edu',
      password: 'secret',
    });
  });

  it('returns null user and error message when Supabase returns an error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await authService.signIn('x@y.z', 'bad');

    expect(result.user).toBeNull();
    expect(result.error).toBe('Invalid login credentials');
  });
});
