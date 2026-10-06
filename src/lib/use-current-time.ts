import { useEffect, useState } from "react";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const intervalId = window.setInterval(
      () => setCurrentTime(Date.now()),
      60_000,
    );

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return currentTime;
}

export function isExpiredAt(expiresAt: string, currentTime: number | null) {
  return currentTime !== null && new Date(expiresAt).getTime() <= currentTime;
}
