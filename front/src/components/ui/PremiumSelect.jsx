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

  const selectedOption = options.find(opt => String(opt.id) === String(value));

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
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-(--surface-1) text-(--text-primary) h-9 px-4 rounded-2xl border transition-all font-bold text-base flex items-center justify-between outline-none
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-(--gold) hover:bg-(--surface-2)'}
          ${isOpen && !disabled ? 'border-(--gold) ring-4 ring-(--gold-soft)' : 'border-(--border)'}
        `}
      >
        <span className={`${!selectedOption ? 'text-(--text-faint)' : 'text-(--text-primary)'} whitespace-nowrap overflow-hidden text-ellipsis`}>
          {selectedOption ? selectedOption.nome : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-(--text-muted) shrink-0 transition-transform duration-300 ${isOpen && !disabled ? 'rotate-180 text-(--gold)' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-(--surface-2)/95 backdrop-blur-xl border border-(--border) rounded-3xl shadow-(--shadow-floating) overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
            {options.length === 0 ? (
              <div className="p-4 text-center text-(--text-muted) text-sm font-black tracking-tight">
                Nenhuma opção disponível
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-base transition-all group
                    ${String(option.id) === String(value)
                      ? 'bg-(--gold-soft) text-(--gold) font-black'
                      : 'text-(--text-secondary) hover:bg-(--surface-3) hover:text-(--text-primary)'}
                  `}
                >
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">{option.nome}</span>
                  {String(option.id) === String(value) && (
                    <Check size={16} className="text-(--gold) shrink-0" />
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
