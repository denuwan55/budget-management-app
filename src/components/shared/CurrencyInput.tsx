import { useRef, useEffect } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  large?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  autoFocus = false,
  className = '',
  large = false,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
    onChange(sanitized);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`text-gray-400 ${large ? 'text-4xl' : 'text-xl'}`}>Rs</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`bg-transparent outline-none w-full font-bold ${
          large ? 'text-4xl' : 'text-xl'
        }`}
      />
    </div>
  );
}
