"use client";

import { ReactNode, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Centering wrapper — offsets for the fixed sidebar on desktop */}
      <div className="fixed inset-0 z-50 flex items-end justify-center p-2 pointer-events-none sm:items-center sm:p-4">
        <div
          className="bg-[#0a1f3a] border border-amber-300/10 rounded-2xl w-full max-w-lg max-h-[94vh] flex flex-col shadow-2xl shadow-black/60 pointer-events-auto sm:max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header — fixed, never scrolls */}
          <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-white/8 shrink-0 sm:px-6">
            <h2 className="min-w-0 truncate text-base font-bold text-white sm:text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto px-4 py-5 flex-1 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
