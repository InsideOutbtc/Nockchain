'use client';

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Remove item from localStorage
  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
}

export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
}

// Hook for storing user preferences
export function useUserPreferences() {
  const [preferences, setPreferences, clearPreferences] = useLocalStorage('nockchain-preferences', {
    theme: 'dark',
    language: 'en',
    currency: 'USD',
    notifications: {
      mining: true,
      trading: true,
      system: true,
      payments: true
    },
    dashboard: {
      refreshInterval: 5000,
      showAdvancedMetrics: false,
      defaultChartPeriod: '24h'
    },
    trading: {
      confirmOrders: true,
      showOrderBook: true,
      defaultPair: 'NOCK/USDT'
    }
  });

  const updatePreference = (path: string, value: any) => {
    setPreferences(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  return {
    preferences,
    updatePreference,
    clearPreferences
  };
}

// Hook for caching API responses
export function useAPICache<T>(key: string, ttl: number = 5 * 60 * 1000) { // 5 minutes default TTL
  const [cache, setCache] = useLocalStorage<{
    data: T | null;
    timestamp: number;
  }>(`api-cache-${key}`, {
    data: null,
    timestamp: 0
  });

  const isValid = () => {
    return cache.timestamp > 0 && (Date.now() - cache.timestamp) < ttl;
  };

  const get = (): T | null => {
    return isValid() ? cache.data : null;
  };

  const set = (data: T) => {
    setCache({
      data,
      timestamp: Date.now()
    });
  };

  const clear = () => {
    setCache({
      data: null,
      timestamp: 0
    });
  };

  return {
    get,
    set,
    clear,
    isValid
  };
}

// Hook for storing form data temporarily
export function useFormPersistence<T extends Record<string, any>>(
  formId: string,
  initialValues: T
) {
  const [formData, setFormData, clearFormData] = useSessionStorage(
    `form-${formId}`,
    initialValues
  );

  const updateField = (field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateFields = (fields: Partial<T>) => {
    setFormData(prev => ({
      ...prev,
      ...fields
    }));
  };

  const resetForm = () => {
    setFormData(initialValues);
  };

  return {
    formData,
    updateField,
    updateFields,
    resetForm,
    clearFormData
  };
}

// Hook for tracking user activity and analytics
export function useActivityTracking() {
  const [activity, setActivity] = useLocalStorage('nockchain-activity', {
    sessions: 0,
    totalTime: 0,
    lastVisit: null,
    features: {} as Record<string, number>,
    preferences: {
      hasSeenOnboarding: false,
      hasConnectedWallet: false,
      hasPlacedOrder: false
    }
  });

  useEffect(() => {
    // Track session start
    const sessionStart = Date.now();
    setActivity(prev => ({
      ...prev,
      sessions: prev.sessions + 1,
      lastVisit: new Date().toISOString()
    }));

    // Track session duration on unmount
    return () => {
      const sessionDuration = Date.now() - sessionStart;
      setActivity(prev => ({
        ...prev,
        totalTime: prev.totalTime + sessionDuration
      }));
    };
  }, []);

  const trackFeatureUsage = (feature: string) => {
    setActivity(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: (prev.features[feature] || 0) + 1
      }
    }));
  };

  const markPreference = (preference: string, value: boolean = true) => {
    setActivity(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  return {
    activity,
    trackFeatureUsage,
    markPreference
  };
}

// Storage utilities
export const StorageUtils = {
  // Check if localStorage is available
  isLocalStorageAvailable: (): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      const test = '__localStorage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  // Get storage size
  getStorageSize: (): { localStorage: number; sessionStorage: number } => {
    if (typeof window === 'undefined') {
      return { localStorage: 0, sessionStorage: 0 };
    }

    const getSize = (storage: Storage): number => {
      let total = 0;
      for (const key in storage) {
        if (storage.hasOwnProperty(key)) {
          total += storage.getItem(key)?.length || 0;
        }
      }
      return total;
    };

    return {
      localStorage: getSize(window.localStorage),
      sessionStorage: getSize(window.sessionStorage)
    };
  },

  // Clear all nockchain data
  clearAllNockchainData: (): void => {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];
    
    // Find all nockchain keys
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('nockchain-') || key?.startsWith('api-cache-') || key?.startsWith('form-')) {
        keysToRemove.push(key);
      }
    }

    // Remove them
    keysToRemove.forEach(key => window.localStorage.removeItem(key));

    // Also clear session storage
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith('nockchain-') || key?.startsWith('form-')) {
        window.sessionStorage.removeItem(key);
      }
    }
  },

  // Export user data
  exportUserData: (): string => {
    if (typeof window === 'undefined') return '{}';

    const data: Record<string, any> = {};
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('nockchain-')) {
        try {
          data[key] = JSON.parse(window.localStorage.getItem(key) || '');
        } catch {
          data[key] = window.localStorage.getItem(key);
        }
      }
    }

    return JSON.stringify(data, null, 2);
  },

  // Import user data
  importUserData: (jsonData: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      const data = JSON.parse(jsonData);
      
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('nockchain-')) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      });

      return true;
    } catch {
      return false;
    }
  }
};