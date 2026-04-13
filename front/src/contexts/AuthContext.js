'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erro ao fazer logout no servidor:', err);
    } finally {
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const checkAuth = useCallback(async () => {
    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      setLoading(false);
      const path = window.location.pathname;
      if (!['/login', '/register'].includes(path)) {
        router.push('/login');
      }
      return;
    }

    try {
      // Carrega estado inicial instantaneamente (otimismo)
      setUser(JSON.parse(savedUser));

      // Valida sessão com o servidor via cookie httpOnly
      const data = await api('/auth/me');
      const freshUser = { ...data, permissions: data.permissions || [] };

      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));

      if (freshUser.mustChangePassword && window.location.pathname !== '/alterar-senha') {
        router.push('/alterar-senha');
      }
    } catch (err) {
      console.error('Erro ao validar sessão:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [router, logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?.mustChangePassword && !loading) {
      if (pathname !== '/alterar-senha') {
        router.replace('/alterar-senha');
      }
    }
  }, [user, loading, router, pathname]);

  const clearMustChangePassword = useCallback(() => {
    setUser(prev => {
      const updated = { ...prev, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const login = async (email, password) => {
    const data = await api('/auth/login', {
      body: { email, password }
    });

    // Permissions agora vêm direto na resposta do servidor (não mais do JWT)
    const userWithPermissions = { ...data.user, permissions: data.user.permissions || [] };

    localStorage.setItem('user', JSON.stringify(userWithPermissions));
    setUser(userWithPermissions);
    router.push(userWithPermissions.mustChangePassword ? '/alterar-senha' : '/');
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
