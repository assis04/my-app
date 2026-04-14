'use client'

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Armchair } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-100/30 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/20 rounded-full blur-3xl -ml-64 -mb-64" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl p-10 sm:p-12 shadow-2xl shadow-sky-900/5 border border-slate-100">
          <div className="flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-linear-to-br from-sky-400 to-sky-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-sky-200 ring-8 ring-sky-50">
              <Armchair size={40} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">Moveis Valcenter</h1>
            <p className="text-slate-400 mt-2 font-medium text-center text-xs">Autenticação Segura</p>
          </div>
          
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-2xl mb-8 text-sm font-bold text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold text-slate-400 ml-1">Endereço de E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-sky-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  id="email" 
                  required 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-6 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-bold placeholder:text-slate-300 shadow-xs"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="text-xs font-bold text-slate-400">Senha de Acesso</label>
                <button 
                  type="button" 
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors"
                  onClick={() => alert('Funcionalidade de recuperação em breve')}
                >
                  Recuperar?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-sky-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-bold placeholder:text-slate-300 shadow-xs"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-sky-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-linear-to-r from-sky-500 to-sky-600 text-white py-5 rounded-2xl hover:shadow-sky-200 hover:shadow-2xl transition-all font-black mt-8 shadow-xl shadow-sky-900/10 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Acessar Sistema</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-12 text-center text-slate-400 font-medium text-xs">
            Moveis <span className="text-sky-500">Valcenter</span> &copy; {new Date().getFullYear()} • Versão 4.0
          </p>
        </div>
      </div>
    </div>
  );
}
