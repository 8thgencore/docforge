import { useEffect, useState } from "react";

export const useDebounce = <T>(value: T, delayMs = 350): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [delayMs, value]);

  return debouncedValue;
};
