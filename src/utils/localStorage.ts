interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

export const localStorageCache = {
  set<T>(key: string, data: T, expiresInMs: number = 5 * 60 * 1000): void {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresIn: expiresInMs,
      };
      localStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('LocalStorage set failed:', error);
    }
  },

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const cached: CachedData<T> = JSON.parse(item);
      const now = Date.now();

      if (now - cached.timestamp > cached.expiresIn) {
        localStorage.removeItem(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('LocalStorage get failed:', error);
      return null;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorage remove failed:', error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('LocalStorage clear failed:', error);
    }
  },

  has(key: string): boolean {
    return this.get(key) !== null;
  },
};
