import { useCallback, useRef } from 'react';

export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs = 250,
) {
  const timerRef = useRef<number | null>(null);

  return useCallback((...args: TArgs) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      callback(...args);
    }, delayMs);
  }, [callback, delayMs]);
}

export function useAsyncActionLock<TArgs extends unknown[]>(
  callback: (...args: TArgs) => Promise<void>,
) {
  const isRunningRef = useRef(false);

  return useCallback(async (...args: TArgs) => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    try {
      await callback(...args);
    } finally {
      isRunningRef.current = false;
    }
  }, [callback]);
}

