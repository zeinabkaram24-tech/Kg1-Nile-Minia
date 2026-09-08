// IndexedDB helper for persisting large sheet files (PDFs, docs, images) attached to materials

const DB_NAME = 'SchoolMaterialsFilesDB';
const DB_VERSION = 1;
const STORE_NAME = 'material_files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

const memoryCache = new Map<string, Blob | File>();

export async function saveMaterialBlob(materialId: string, blob: Blob | File): Promise<void> {
  memoryCache.set(materialId, blob);
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, materialId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not save file to IndexedDB:', err);
  }
}

export async function getMaterialBlob(materialId: string): Promise<Blob | null> {
  if (memoryCache.has(materialId)) {
    return memoryCache.get(materialId) || null;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(materialId);

      request.onsuccess = () => {
        const result = request.result || null;
        if (result) {
          memoryCache.set(materialId, result);
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not read file from IndexedDB:', err);
    return null;
  }
}

export async function deleteMaterialBlob(materialId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(materialId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not delete file from IndexedDB:', err);
  }
}

export async function deleteMultipleMaterialBlobs(materialIds: string[]): Promise<void> {
  if (!materialIds || materialIds.length === 0) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const id of materialIds) {
        store.delete(id);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Could not delete multiple files from IndexedDB:', err);
  }
}
