import { create } from 'zustand';

import { Toast } from './toast';

interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToastStore();

  return (
    <>
      <div className="fixed bottom-4 end-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      {children}
    </>
  );
}

export function useToast() {
  const { addToast } = useToastStore();

  return {
    success: (message: string) => addToast(message, 'success'),
    error: (message: string) => addToast(message, 'error'),
    warning: (message: string) => addToast(message, 'warning'),
    info: (message: string) => addToast(message, 'info'),
  };
}
