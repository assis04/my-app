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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      setLoading(false);
      if (!['/login', '/register'].includes(pathname)) {
        router.push('/login');
      }
      return;
    }

    try {
      // Carrega estado inicial instantaneamente (otimismo)
      setUser(JSON.parse(savedUser));
      
      // Valida token com o servidor e atualiza permissões em tempo real
      const data = await api('/auth/me');
      const freshUser = { ...data, permissions: data.permissions || [] };
      
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch (err) {
      console.error('Erro ao validar sessão:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [pathname, router, logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const data = await api('/auth/login', {
        body: { email, password }
      });

      // Decodificar o JWT para extrair as permissions inclusas no token
      let permissions = [];
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        permissions = payload.permissions || [];
      } catch (_) {}

      const userWithPermissions = { ...data.user, permissions };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userWithPermissions));
      setUser(userWithPermissions);
      router.push('/');
      return data;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
