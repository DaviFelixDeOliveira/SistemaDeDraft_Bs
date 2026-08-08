import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
  processingText?: string;
  successText?: string;
  delayMs?: number;
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar',
  onConfirm, 
  onCancel,
  variant = 'primary',
  processingText = 'Processando...',
  successText = 'Concluído com sucesso!',
  delayMs = 2000
}: ConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setShowToast(false);
    }
  }, [isOpen]);

  if (!isOpen && !showToast) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await onConfirm();
    setIsProcessing(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <>
      {isOpen && !showToast && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isProcessing ? processingText : title}
                  </h3>
                  <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm">
                    {isProcessing ? 'Por favor, aguarde...' : message}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 ${
                    variant === 'danger' 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguarde...
                    </span>
                  ) : confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-[110] bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-bold">{successText}</span>
        </div>
      )}
    </>
  );
}
