'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function PremiumSelect({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Selecione...', 
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Encontrar o label do item selecionado
  const selectedOption = options.find(opt => String(opt.id) === String(value));

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    onChange({ target: { value: optionValue } }); // Simula o evento nativo
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={containerRef}>
      {/* Gatilho (Trigger) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 text-slate-900 p-4 rounded-2xl border transition-all font-bold text-sm flex items-center justify-between outline-none 
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen && !disabled ? 'border-sky-500 ring-4 ring-sky-500/10 bg-white' : 'border-slate-200 hover:border-slate-300 hover:bg-white'}
        `}
      >
        <span className={!selectedOption ? 'text-slate-300' : 'text-slate-900'}>
          {selectedOption ? selectedOption.nome : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={`text-slate-400 transition-transform duration-300 ${isOpen && !disabled ? 'rotate-180 text-sky-500' : ''}`} 
        />
      </button>

      {/* Lista de Opções (Dropdown) */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
            {options.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                Nenhuma opção disponível
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm transition-all group
                    ${String(option.id) === String(value)
                      ? 'bg-sky-50 text-sky-600 font-black' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                  `}
                >
                  <span>{option.nome}</span>
                  {String(option.id) === String(value) && (
                    <Check size={16} className="text-sky-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
