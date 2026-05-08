'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (v) => /[A-Z]/.test(v), label: 'Uma letra maiúscula' },
  { test: (v) => /[a-z]/.test(v), label: 'Uma letra minúscula' },
  { test: (v) => /[0-9]/.test(v), label: 'Um número' },
  { test: (v) => /[\W_]/.test(v), label: 'Um caractere especial' },
];

export default function AlterarSenha() {
  const { user, loading, clearMustChangePassword } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !user.mustChangePassword) {
      router.push('/');
    }
  }, [user, loading, router]);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(newPassword));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allRulesPass) return;

    setSubmitting(true);
    try {
      await api('/auth/change-password', {
        body: { currentPassword, newPassword },
      });
      clearMustChangePassword();
      router.push('/');
    } catch (err) {
      setError(err || 'Erro ao alterar senha.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-(--surface-1) font-sans p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-(--gold-soft)/30 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-(--gold-soft)/20 rounded-full blur-3xl -ml-64 -mb-64" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-(--surface-2) rounded-3xl p-10 sm:p-12 shadow-2xl border border-(--border-subtle)">
          <div className="flex flex-col items-center mb-10">
            <img src="/Valcenter.svg" alt="Móveis Valcenter" className="w-56 h-auto mb-8" />
            <div className="w-12 h-12 bg-(--gold-soft) border border-(--gold)/40 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck size={24} className="text-(--gold)" />
            </div>
            <h1 className="text-2xl font-black text-(--text-primary) tracking-tight text-center">Primeiro Acesso</h1>
            <p className="text-(--text-muted) mt-2 font-medium text-center text-sm max-w-[260px]">
              Por segurança, crie uma nova senha pessoal para continuar.
            </p>
          </div>

          {error && (
            <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) px-6 py-4 rounded-2xl mb-8 text-base font-bold text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-(--danger) animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm font-bold text-(--text-muted) ml-1">Senha Atual</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--gold) transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  id="currentPassword"
                  required
                  className="w-full bg-(--surface-1) border border-(--border) text-(--text-primary) pl-12 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-(--gold)/10 focus:border-(--gold) transition-all font-bold placeholder:text-(--text-muted) shadow-xs"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-(--text-muted) hover:text-(--gold) transition-colors"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-bold text-(--text-muted) ml-1">Nova Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--gold) transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  id="newPassword"
                  required
                  className="w-full bg-(--surface-1) border border-(--border) text-(--text-primary) pl-12 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-(--gold)/10 focus:border-(--gold) transition-all font-bold placeholder:text-(--text-muted) shadow-xs"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-(--text-muted) hover:text-(--gold) transition-colors"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {newPassword.length > 0 && (
              <div className="space-y-1.5 px-1">
                {PASSWORD_RULES.map((rule) => {
                  const pass = rule.test(newPassword);
                  return (
                    <div key={rule.label} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full transition-colors ${pass ? 'bg-(--success)' : 'bg-(--surface-3)'}`} />
                      <span className={`text-sm font-medium transition-colors ${pass ? 'text-(--success)' : 'text-(--text-muted)'}`}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !allRulesPass || !currentPassword}
              className="w-full bg-(--gold) text-(--on-gold) py-5 rounded-2xl  hover:shadow-2xl transition-all font-black mt-8 shadow-xl flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span className="text-base">Confirmar Nova Senha</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-12 text-center text-(--text-muted) font-medium text-sm">
            Moveis <span className="text-(--gold)">Valcenter</span> &copy; {new Date().getFullYear()} &bull; Versão 4.0
          </p>
        </div>
      </div>
    </div>
  );
}
