'use client';

import { Lock } from 'lucide-react';

/**
 * Banner read-only para leads em Venda/Pós-venda sem permissão
 * `crm:leads:edit-after-sale`.
 *
 * Props:
 *  - status: string — status atual do lead
 *
 * Spec: specs/crm.md §9.14 | Plan: specs/crm-frontend-plan.md F4.6
 */
export default function PostSaleReadOnlyBanner({ status }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 p-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm animate-in slide-in-from-top-2"
    >
      <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
        <Lock size={14} />
      </div>
      <div className="flex-1">
        <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight mb-0.5">
          Edição bloqueada — Lead em {status}
        </h4>
        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
          Após a venda, o lead entra em modo somente leitura. Apenas administradores com permissão
          <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-[10px] font-mono">
            crm:leads:edit-after-sale
          </code>
          podem editar. Se precisar alterar algo, peça a um administrador.
        </p>
      </div>
    </div>
  );
}
