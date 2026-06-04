import { useEffect, useState } from "react";

export function useTicker(lines: string[], intervalMs = 4000) {
  const filtered = lines.filter((line) => line.trim().length > 0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [filtered.join("\0")]);

  useEffect(() => {
    if (filtered.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % filtered.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [filtered.length, intervalMs, filtered.join("\0")]);

  return filtered[index] ?? "";
}
