// Temporary no-hook toast shim to prevent invalid hook call crashes
// Restores simple API compatible with existing imports

export type ToastOptions = {
  title?: any;
  description?: any;
  action?: any;
  duration?: number;
  variant?: string;
};

const logToast = (opts: ToastOptions) => {
  try {
    // Keep a harmless log for visibility during the temporary shim
    console.debug("Toast:", opts?.title ?? opts);
  } catch (_) {}
  return {
    id: "0",
    dismiss: () => {},
    update: () => {},
  };
};

export function useToast() {
  return {
    toasts: [] as any[],
    toast: logToast,
    dismiss: (_?: string) => {},
  };
}

export const toast = logToast;
