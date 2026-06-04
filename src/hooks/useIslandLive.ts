import { useCallback, useEffect, useState } from "react";
import type { IslandSnapshot } from "../types";
import {
  isIslandSnapshot,
  resolveIslandHttpUrl,
  resolveIslandWsUrl
} from "../lib/liveIsland";

export type LiveConnectionState = "connecting" | "connected" | "offline";

export function useIslandLive() {
  const [snapshot, setSnapshot] = useState<IslandSnapshot | null>(null);
  const [connectionState, setConnectionState] =
    useState<LiveConnectionState>("connecting");

  const applySnapshot = useCallback((value: unknown) => {
    if (isIslandSnapshot(value)) {
      setSnapshot(value);
      setConnectionState("connected");
    }
  }, []);

  const pullSnapshot = useCallback(async () => {
    try {
      const response = await fetch(
        `${resolveIslandHttpUrl(window.location.href)}/snapshot`
      );
      if (!response.ok) return false;
      applySnapshot(await response.json());
      return true;
    } catch {
      return false;
    }
  }, [applySnapshot]);

  useEffect(() => {
    void pullSnapshot();

    const wsUrl =
      import.meta.env.VITE_ISLAND_WS_URL ?? resolveIslandWsUrl(window.location.href);
    const socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {
      setConnectionState("connected");
      void pullSnapshot();
    });
    socket.addEventListener("close", () => setConnectionState("offline"));
    socket.addEventListener("error", () => setConnectionState("offline"));
    socket.addEventListener("message", (event) => {
      try {
        applySnapshot(JSON.parse(event.data));
      } catch {
        setConnectionState("offline");
      }
    });

    const poll = window.setInterval(() => {
      void pullSnapshot();
    }, 4000);

    return () => {
      window.clearInterval(poll);
      socket.close();
    };
  }, [applySnapshot, pullSnapshot]);

  return { snapshot, connectionState };
}
