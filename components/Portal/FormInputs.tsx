"use client";

import { useState, useRef, useEffect } from "react";

// ─── FormInput ────────────────────────────────────────────────────────────────

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function FormInput({ label, error, className, ...props }: FormInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full px-4 py-2.5 bg-black/20 border border-amber-300/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-white/6 transition-all text-sm ${className ?? ""}`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── FormSelect (custom dropdown — no native OS styling) ──────────────────────

interface FormSelectProps {
  label?: string;
  error?: string;
  value: string | undefined;
  onChange: (e: { target: { value: string } }) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function FormSelect({ label, error, value, onChange, options, required, placeholder, className }: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === (value ?? ""));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(val: string) {
    onChange({ target: { value: val } });
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full px-4 py-2.5 bg-black/20 border border-amber-300/10 rounded-xl text-left text-sm flex items-center justify-between gap-2 focus:outline-none focus:border-amber-300/50 transition-all"
      >
        <span className={selected ? "text-white" : "text-gray-600"}>
          {selected?.label ?? placeholder ?? "Select…"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-200 w-full mt-1 bg-[#0d2540] border border-white/12 rounded-xl shadow-2xl shadow-black/60 overflow-hidden max-h-56 overflow-y-auto">
          {!required && (
            <button
              type="button"
              onClick={() => pick("")}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-white/8 transition-colors"
            >
              {placeholder ?? "Select…"}
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => pick(opt.value)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                opt.value === (value ?? "")
                  ? "bg-amber-300/20 text-amber-200 font-medium"
                  : "text-gray-300 hover:bg-white/8"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── FormTextarea ─────────────────────────────────────────────────────────────

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function FormTextarea({ label, error, className, ...props }: FormTextareaProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`w-full px-4 py-2.5 bg-black/20 border border-amber-300/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-white/6 transition-all text-sm resize-none ${className ?? ""}`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
