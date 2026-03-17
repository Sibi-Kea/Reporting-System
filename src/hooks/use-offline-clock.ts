"use client";

import { useEffect, useState } from "react";

type OfflineAction = {
  endpoint: "/api/clockin" | "/api/clockout";
  payload: Record<string, unknown>;
  queuedAt: string;
};

const storageKey = "worktrack-offline-actions";

function readQueue() {
  if (typeof window === "undefined") {
    return [] as OfflineAction[];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineAction[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(queue));
}

export function useOfflineClock() {
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setQueuedCount(readQueue().length);

    async function syncQueue() {
      if (!navigator.onLine) {
        return;
      }

      const queue = readQueue();

      if (!queue.length) {
        setQueuedCount(0);
        return;
      }

      setIsSyncing(true);
      const remaining: OfflineAction[] = [];

      for (const item of queue) {
        try {
          const response = await fetch(item.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(item.payload),
          });

          if (!response.ok) {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }

      writeQueue(remaining);
      setQueuedCount(remaining.length);
      setIsSyncing(false);
    }

    void syncQueue();
    window.addEventListener("online", syncQueue);
    return () => window.removeEventListener("online", syncQueue);
  }, []);

  function enqueueAction(action: OfflineAction) {
    const nextQueue = [...readQueue(), action];
    writeQueue(nextQueue);
    setQueuedCount(nextQueue.length);
  }

  return {
    queuedCount,
    isSyncing,
    enqueueAction,
  };
}
