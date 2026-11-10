/** Minimal IndexedDB key-value store for things too big for localStorage (recordings, photos). */
const DB = 'littleBarn', STORE = 'kv';
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(db => new Promise<T>((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  }));
}
export const dbGet = <T = any>(k: string) => run<T | undefined>('readonly', s => s.get(k)).catch(() => undefined);
export const dbSet = (k: string, v: any) => run<void>('readwrite', s => s.put(v, k)).catch(() => undefined);
export const dbDel = (k: string) => run<void>('readwrite', s => s.delete(k)).catch(() => undefined);
export const dbKeys = () => run<IDBValidKey[]>('readonly', s => s.getAllKeys()).then(k => k.map(String)).catch(() => [] as string[]);
