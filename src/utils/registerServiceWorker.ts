export const registerServiceWorker = async (): Promise<void> => {
  // Disable Service Worker entirely to prevent stale cached bundles causing React duplicates
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      console.log("Service Worker disabled and caches cleared");
    } catch (error) {
      console.error("Service Worker cleanup failed:", error);
    }
  }
};

export const requestBackgroundSync = async (_tag: string): Promise<void> => {
  // No-op since service worker is disabled for stability
};

export const isOffline = (): boolean => {
  return !navigator.onLine;
};

export const setupOfflineListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};
