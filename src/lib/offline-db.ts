/**
 * Frontend IndexedDB offline mode (Day 28).
 * Stores product snapshot + queued transactions for POS offline capability.
 */

export type OfflineProduct = {
  id: string;
  sku: string;
  name: string;
  memberPrice: number;
  retailPrice: number;
  pv: number;
  stock: number;
};

export type QueuedTransaction = {
  id: string; // unique key per queue item
  tenantId: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number; isMember: boolean }>;
  memberStatus: "member" | "non-member";
  memberId?: string;
  discount?: number;
  createdAt: number; // timestamp
  status: "pending" | "sent" | "failed"; // sent=synced to backend
  errorMessage?: string;
  idempotencyKey?: string; // generated server-side on checkout
};

const DB_NAME = "hni-pos-offline";
const DB_VERSION = 1;
const STORE_PRODUCTS = "products";
const STORE_QUEUE = "transaction-queue";

async function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

export async function saveProductSnapshot(products: OfflineProduct[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_PRODUCTS], "readwrite");
  const store = tx.objectStore(STORE_PRODUCTS);

  // Clear old
  await new Promise<void>((resolve, reject) => {
    const clearReq = store.clear();
    clearReq.onerror = () => reject(clearReq.error);
    clearReq.onsuccess = () => resolve();
  });

  // Add new
  for (const product of products) {
    await new Promise<void>((resolve, reject) => {
      const addReq = store.add(product);
      addReq.onerror = () => reject(addReq.error);
      addReq.onsuccess = () => resolve();
    });
  }
}

export async function getProductSnapshot(): Promise<OfflineProduct[]> {
  const db = await getDb();
  const tx = db.transaction([STORE_PRODUCTS], "readonly");
  const store = tx.objectStore(STORE_PRODUCTS);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function queueTransaction(tx: QueuedTransaction): Promise<number> {
  const db = await getDb();
  const trx = db.transaction([STORE_QUEUE], "readwrite");
  const store = trx.objectStore(STORE_QUEUE);

  return new Promise((resolve, reject) => {
    const req = store.add(tx);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as number);
  });
}

export async function getQueuedTransactions(tenantId: string): Promise<QueuedTransaction[]> {
  const db = await getDb();
  const tx = db.transaction([STORE_QUEUE], "readonly");
  const store = tx.objectStore(STORE_QUEUE);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as QueuedTransaction[]).filter((q) => q.tenantId === tenantId));
  });
}

export async function markTransactionSent(id: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_QUEUE], "readwrite");
  const store = tx.objectStore(STORE_QUEUE);

  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as QueuedTransaction;
      if (item) {
        item.status = "sent";
        const updateReq = store.put(item);
        updateReq.onerror = () => reject(updateReq.error);
        updateReq.onsuccess = () => resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteQueuedTransaction(id: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_QUEUE], "readwrite");
  const store = tx.objectStore(STORE_QUEUE);

  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export async function clearAllOfflineData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_PRODUCTS, STORE_QUEUE], "readwrite");

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const req = tx.objectStore(STORE_PRODUCTS).clear();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    }),
    new Promise<void>((resolve, reject) => {
      const req = tx.objectStore(STORE_QUEUE).clear();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    }),
  ]);
}
