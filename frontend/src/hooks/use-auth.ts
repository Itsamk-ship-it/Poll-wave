'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/services';
import { getErrorMessage } from '@/lib/api';

export function useAuth() {
  const router = useRouter();
  const { user, accessToken, setAuth, logout: storeLogout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Welcome back, ${data.user.name ?? data.user.username}!`);
      router.push('/dashboard');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Login failed')),
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Account created — welcome to PollWave!');
      router.push('/dashboard');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Registration failed')),
  });

  const logout = () => {
    storeLogout();
    toast.success('Logged out');
    router.push('/');
  };

  return {
    user,
    isAuthenticated: Boolean(accessToken && user),
    login: loginMutation.mutate,
    loginPending: loginMutation.isPending,
    register: registerMutation.mutate,
    registerPending: registerMutation.isPending,
    logout,
  };
}
