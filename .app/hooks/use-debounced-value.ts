"use client";

import { useEffect, useRef, useState } from "react";

export const useDebouncedValue = <T>(
  value: T,
  delayMs: number,
  onCancelActive?: () => void,
) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    if (!Object.is(previousRef.current, value)) {
      onCancelActive?.();
      previousRef.current = value;
    }

    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, onCancelActive, value]);

  return debouncedValue;
};
