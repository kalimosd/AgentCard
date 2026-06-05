import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentSnapshot } from "../types";
import {
  isAgentSnapshot,
  resolveAgentCardHttpUrl,
  resolveAgentCardWsUrl
} from "../lib/liveAgent";

export type LiveConnectionState = "connecting" | "connected" | "offline";

export function useAgentLive() {
  const [snapshot, setSnapshot] = useState<AgentSnapshot | null>(null);
  const [connectionState, setConnectionState] =
    useState<LiveConnectionState>("connecting");
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000); // exponential backoff, starts at 1s

  const applySnapshot = useCallback((value: unknown) => {
    if (isAgentSnapshot(value)) {
      setSnapshot(value);
      setConnectionState("connected");
    }
  }, []);

  const pullSnapshot = useCallback(async () => {
    try {
      const response = await fetch(
        `${resolveAgentCardHttpUrl(window.location.href)}/snapshot`
      );
      if (!response.ok) return false;
      applySnapshot(await response.json());
      return true;
    } catch {
      return false;
    }
  }, [applySnapshot]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    function connect() {
      if (stopped) return;

      const wsUrl =
        import.meta.env.VITE_AGENTCARD_WS_URL ??
        import.meta.env.VITE_ISLAND_WS_URL ??
        resolveAgentCardWsUrl(window.location.href);

      setConnectionState("connecting");
      socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => {
        reconnectDelay.current = 1000;
        setConnectionState("connected");
        void pullSnapshot();
      });

      socket.addEventListener("close", () => {
        setConnectionState("offline");
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        setConnectionState("offline");
        scheduleReconnect();
      });

      socket.addEventListener("message", (event) => {
        try {
          applySnapshot(JSON.parse(event.data));
        } catch {
          setConnectionState("offline");
        }
      });
    }

    function scheduleReconnect() {
      if (stopped) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
        connect();
      }, reconnectDelay.current);
    }

    void pullSnapshot();
    connect();

    poll = window.setInterval(() => {
      void pullSnapshot();
    }, 4000);

    return () => {
      stopped = true;
      if (poll !== null) window.clearInterval(poll);
      if (reconnectTimer.current !== null) clearTimeout(reconnectTimer.current);
      if (socket) socket.close();
    };
  }, [applySnapshot, pullSnapshot]);

  return { snapshot, connectionState };
}
