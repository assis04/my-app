'use client'

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

function WardrobeIcon({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="2" width="18" height="20" rx="2" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="9" y1="10" x2="9" y2="14" />
      <line x1="15" y1="10" x2="15" y2="14" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-(--surface-1) font-sans p-4 relative overflow-hidden">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-(--gold-soft)/30 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-(--gold-soft)/20 rounded-full blur-3xl -ml-64 -mb-64" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-(--surface-2) rounded-3xl p-10 sm:p-12 shadow-2xl border border-(--border-subtle)">
          <div className="flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-(--gold) rounded-3xl flex items-center justify-center mb-8 shadow-xl ring-8 ring-(--gold)">
              <WardrobeIcon size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-(--text-primary) tracking-tight text-center">Moveis Valcenter</h1>
            <p className="text-(--text-muted) mt-2 font-medium text-center text-sm">Autenticação Segura</p>
          </div>
          
          {error && (
            <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) px-6 py-4 rounded-2xl mb-8 text-base font-bold text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-(--danger) animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold text-(--text-muted) ml-1">Endereço de E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--gold) transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  id="email" 
                  required 
                  className="w-full bg-(--surface-1) border border-(--border) text-(--text-primary) pl-12 pr-6 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-(--gold)/10 focus:border-(--gold) transition-all font-bold placeholder:text-(--text-muted) shadow-xs"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="text-sm font-bold text-(--text-muted)">Senha de Acesso</label>
                <button 
                  type="button" 
                  className="text-sm font-bold text-(--gold) hover:text-(--gold-hover) transition-colors"
                  onClick={() => alert('Funcionalidade de recuperação em breve')}
                >
                  Recuperar?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--gold) transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  className="w-full bg-(--surface-1) border border-(--border) text-(--text-primary) pl-12 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-(--gold)/10 focus:border-(--gold) transition-all font-bold placeholder:text-(--text-muted) shadow-xs"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-(--text-muted) hover:text-(--gold) transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-(--gold) text-(--on-gold) py-5 rounded-2xl  hover:shadow-2xl transition-all font-black mt-8 shadow-xl flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span className="text-base">Acessar Sistema</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-12 text-center text-(--text-muted) font-medium text-sm">
            Moveis <span className="text-(--gold)">Valcenter</span> &copy; {new Date().getFullYear()} • Versão 4.0
          </p>
        </div>
      </div>
    </div>
  );
}
