import { useEffect, useState, useCallback } from "react";
import { getProductSnapshot, getQueuedTransactions, saveProductSnapshot, markTransactionSent, deleteQueuedTransaction, QueuedTransaction, OfflineProduct } from "./offline-db";

type UseOfflineSyncProps = {
  tenantId: string;
  apiUrl: string;
  accessToken: string;
};

type UseOfflineSyncReturn = {
  isOnline: boolean;
  products: OfflineProduct[];
  queue: QueuedTransaction[];
  loading: boolean;
  syncQueue: () => Promise<void>;
  fetchSnapshot: () => Promise<void>;
};

export function useOfflineSync({ tenantId, apiUrl, accessToken }: UseOfflineSyncProps): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(false);
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [queue, setQueue] = useState<QueuedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/offline/snapshot`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
      });
      if (!res.ok) throw new Error("Snapshot fetch gagal");
      const data = (await res.json()) as { products: OfflineProduct[] };
      await saveProductSnapshot(data.products);
      setProducts(data.products);
    } catch (e) {
      console.error("Offline snapshot error:", e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, accessToken, tenantId]);

  const syncQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;
    for (const item of queue) {
      if (item.status === "sent") continue;
      try {
        const res = await fetch(`${apiUrl}/transactions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "x-tenant-id": tenantId,
            "Idempotency-Key": item.idempotencyKey || `offline-${item.id}`,
          },
          body: JSON.stringify({
            customerId: item.customerId,
            items: item.items,
            memberStatus: item.memberStatus,
            discount: item.discount,
          }),
        });
        if (res.ok) {
          await markTransactionSent(item.id as unknown as number);
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "sent" } : q)));
        } else {
          console.error(`Sync failed for queue ${item.id}:`, res.status);
          const msg = `HTTP ${res.status}`;
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, errorMessage: msg } : q)));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, errorMessage: msg } : q)));
      }
    }
  }, [isOnline, queue, apiUrl, accessToken, tenantId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [syncQueue]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      fetchSnapshot();
    }
  }, [fetchSnapshot]);

  useEffect(() => {
    const loadQueue = async () => {
      const q = await getQueuedTransactions(tenantId);
      setQueue(q);
    };
    loadQueue();
  }, [tenantId]);

  return { isOnline, products, queue, loading, syncQueue, fetchSnapshot };
}
