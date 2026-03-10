'use client'

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      console.error('Erro na requisição:', err);
      setError(err || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] font-sans p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1e1e1e] rounded-3xl p-8 shadow-2xl border border-zinc-800/50">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-[#d946ef] to-[#c026d3] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-900/20">
               <span className="text-3xl font-bold text-white tracking-widest">{`{ }`}</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Bem-vindo de volta</h1>
            <p className="text-zinc-400 mt-2">Entre na sua conta para continuar</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300 ml-1">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-[#e81cff] transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  id="email" 
                  required 
                  className="w-full bg-[#2a2a2a] border border-zinc-700/50 text-white pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e81cff]/50 focus:border-[#e81cff] transition-all placeholder:text-zinc-600"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300">Senha</label>
                <button 
                  type="button" 
                  className="text-xs font-semibold text-[#e81cff] hover:text-[#d946ef] transition-colors"
                  onClick={() => alert('Funcionalidade de recuperação em breve')}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-[#e81cff] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  id="password" 
                  required 
                  className="w-full bg-[#2a2a2a] border border-zinc-700/50 text-white pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e81cff]/50 focus:border-[#e81cff] transition-all placeholder:text-zinc-600"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#d946ef] to-[#c026d3] text-white py-3.5 rounded-xl hover:opacity-90 transition-all font-bold mt-6 shadow-lg shadow-fuchsia-900/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-zinc-500 text-sm">
              Não tem uma conta?{' '}
              <a href="/register" className="text-white font-semibold hover:text-[#e81cff] transition-colors">
                Criar conta gratuita
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
