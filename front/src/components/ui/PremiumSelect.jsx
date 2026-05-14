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
        className={`w-full bg-(--surface-1) text-(--text-primary) h-9 px-3 rounded-lg border transition-colors font-medium text-sm flex items-center justify-between gap-2 min-w-0 outline-none
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-(--gold)/40 hover:bg-(--surface-2)'}
          ${isOpen && !disabled ? 'border-(--gold) ring-2 ring-(--gold-soft)' : 'border-(--border)'}
        `}
      >
        <span className={`min-w-0 flex-1 text-left truncate ${!selectedOption ? 'text-(--text-faint)' : 'text-(--text-primary)'}`}>
          {selectedOption ? selectedOption.nome : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-(--text-muted) shrink-0 transition-transform duration-200 ${isOpen && !disabled ? 'rotate-180 text-(--gold)' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-(--surface-2) border border-(--border) rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
          <div className={`p-1 ${options.length > 5 ? 'max-h-60 overflow-y-auto custom-scrollbar' : ''}`}>
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-center text-(--text-muted) text-sm font-medium">
                Nenhuma opção disponível
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`w-full flex items-center justify-between gap-2 min-w-0 px-2.5 py-2 rounded-lg text-left text-sm transition-colors
                    ${String(option.id) === String(value)
                      ? 'bg-(--surface-3) text-(--text-primary) font-medium'
                      : 'text-(--text-secondary) font-medium hover:bg-(--surface-3) hover:text-(--text-primary)'}
                  `}
                >
                  <span className="min-w-0 flex-1 truncate">{option.nome}</span>
                  {String(option.id) === String(value) && (
                    <Check size={14} className="text-(--gold) shrink-0" />
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
