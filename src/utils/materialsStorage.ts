import { MaterialItem } from '../types';
export type { MaterialItem };
import {
  isSupabaseConfigured,
  fetchAllMaterialsFromSupabase,
  saveMaterialToSupabase,
  deleteMaterialFromSupabase,
} from '../lib/supabase';

const DB_NAME = 'SchoolMaterialsDB';
const STORE_NAME = 'materials';
const DB_VERSION = 1;
const EVENT_NAME = 'school_materials_updated';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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

// In-memory fallback if IndexedDB has issues
const FALLBACK_KEY = 'school_materials_fallback';
const IN_MEMORY_MATERIALS_FALLBACK: Record<string, string> = {};

function getFallbackMaterials(): MaterialItem[] {
  try {
    const raw = IN_MEMORY_MATERIALS_FALLBACK[FALLBACK_KEY];
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFallbackMaterials(items: MaterialItem[]) {
  try {
    IN_MEMORY_MATERIALS_FALLBACK[FALLBACK_KEY] = JSON.stringify(items);
  } catch (e) {
    console.warn('In-memory cache failed:', e);
  }
}

// Helper to save items into local IndexedDB
async function saveItemsToLocalDB(items: MaterialItem[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) {
      store.put(item);
    }
  } catch (e) {
    saveFallbackMaterials(items);
  }
}

// Retrieve all materials (from Server API + Supabase Cloud + Local IndexedDB merged seamlessly)
export async function getAllMaterials(): Promise<MaterialItem[]> {
  // 1. Fetch local items first
  let localItems: MaterialItem[] = [];
  try {
    const db = await openDB();
    localItems = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        resolve(getFallbackMaterials());
      };
    });
  } catch (e) {
    console.warn('IndexedDB read failed, using fallback', e);
    localItems = getFallbackMaterials();
  }

  const itemsMap = new Map<string, MaterialItem>();
  localItems.forEach((item) => itemsMap.set(item.id, item));

  // 2. Fetch from centralized Server API (/api/materials) - Cross-device sync between Mobile, Laptop & Desktop!
  try {
    const res = await fetch('/api/materials');
    if (res.ok) {
      const serverItems: MaterialItem[] = await res.json();
      if (Array.isArray(serverItems)) {
        serverItems.forEach((serverItem) => {
          const localMatch = itemsMap.get(serverItem.id);
          // If local has fileData but server doesn't, keep local fileData
          if (localMatch && localMatch.fileData && !serverItem.fileData) {
            itemsMap.set(serverItem.id, { ...serverItem, fileData: localMatch.fileData });
          } else {
            itemsMap.set(serverItem.id, serverItem);
          }
        });

        // Background Sync: If mobile has local files that were never uploaded to server, push them to server now!
        const missingOnServer = localItems.filter(
          (loc) => !serverItems.some((srv) => srv.id === loc.id)
        );
        if (missingOnServer.length > 0) {
          console.log(`[MaterialsSync] Syncing ${missingOnServer.length} local items to server for cross-device access...`);
          missingOnServer.forEach((item) => {
            fetch('/api/materials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }).catch((err) => console.warn('Background sync item to server failed:', err));
          });
        }
      }
    }
  } catch (serverErr) {
    console.warn('Could not fetch server materials:', serverErr);
  }

  // 3. Fetch from Supabase Cloud if configured
  if (isSupabaseConfigured) {
    try {
      const cloudItems = await fetchAllMaterialsFromSupabase();
      if (cloudItems && cloudItems.length > 0) {
        cloudItems.forEach((cloudItem) => {
          const existing = itemsMap.get(cloudItem.id);
          if (existing && existing.fileData && !cloudItem.fileData) {
            itemsMap.set(cloudItem.id, { ...cloudItem, fileData: existing.fileData });
          } else {
            itemsMap.set(cloudItem.id, cloudItem);
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch cloud materials:', err);
    }
  }

  const finalItems = Array.from(itemsMap.values());

  // Cache back to local DB so it's always accessible offline on laptop as well
  saveItemsToLocalDB(finalItems).catch(() => {});

  return finalItems;
}

// Save or add a material (saves locally AND to central server AND Supabase Cloud)
export async function saveMaterial(item: MaterialItem): Promise<void> {
  // 1. Save to local IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to save to IndexedDB, saving to fallback', e);
    const existing = getFallbackMaterials().filter((m) => m.id !== item.id);
    existing.push(item);
    saveFallbackMaterials(existing);
  }

  // 2. Centralized Server Persistence (/api/materials) for laptop & all devices
  try {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.item && data.item.storageUrl) {
        item.storageUrl = data.item.storageUrl;
      }
    }
  } catch (serverErr) {
    console.warn('Failed to sync material to server API:', serverErr);
  }

  // 3. Sync to Supabase Cloud Database if configured
  if (isSupabaseConfigured) {
    try {
      await saveMaterialToSupabase(item);
    } catch (err) {
      console.warn('Failed to sync material to Supabase cloud:', err);
    }
  }

  // Notify components across app
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// Delete a material (deletes locally, from server, and from Supabase Cloud)
export async function deleteMaterial(id: string, storageUrl?: string): Promise<void> {
  // 1. Delete from local IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to delete from IndexedDB, deleting from fallback', e);
    const existing = getFallbackMaterials().filter((m) => m.id !== id);
    saveFallbackMaterials(existing);
  }

  // 2. Delete from centralized server
  try {
    await fetch(`/api/materials/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (serverErr) {
    console.warn('Failed to delete material from server API:', serverErr);
  }

  // 3. Delete from Supabase Cloud
  if (isSupabaseConfigured) {
    try {
      await deleteMaterialFromSupabase(id, storageUrl);
    } catch (err) {
      console.warn('Failed to delete material from Supabase cloud:', err);
    }
  }

  // Notify components
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// Subscribe to updates
export function subscribeToMaterials(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}

// Helper to format bytes
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Convert data URL to Blob
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Resolve a MaterialItem from a given URL or file name
export function resolveMaterialItem(urlOrName?: string, defaultTitle?: string): MaterialItem {
  const all = getFallbackMaterials();

  if (urlOrName) {
    const found = all.find(
      (m) =>
        m.storageUrl === urlOrName ||
        m.linkUrl === urlOrName ||
        (m.fileName && urlOrName.includes(m.fileName))
    );
    if (found) return found;
  }

  return {
    id: `mat-${Math.random().toString(36).slice(2, 8)}`,
    fileName: defaultTitle || (urlOrName ? urlOrName.split('/').pop()?.split('?')[0] : 'ملف PDF مرفق.pdf') || 'ملف PDF مرفق.pdf',
    fileSize: 0,
    block: 1,
    section: 'General',
    classId: 'ALL',
    type: 'pdf',
    storageUrl: urlOrName || '',
    linkUrl: urlOrName || '',
    uploadedAt: new Date().toISOString(),
  };
}

// Open PDF or Link directly in our guaranteed In-App Viewer Modal
export function openPdfItem(item: MaterialItem): void {
  try {
    // Dispatch custom event to open In-App PDF Viewer Modal directly in place
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open_pdf_viewer_modal', { detail: item }));
    }
  } catch (e) {
    console.error('Error opening PDF in modal:', e);
  }
}

// Universal Print Function for PDF item (supports storageUrl, server endpoint, and dataUrl)
export function printPdfItem(item: MaterialItem): void {
  try {
    const targetUrl = item.storageUrl
      ? item.storageUrl
      : item.fileData
      ? URL.createObjectURL(dataUrlToBlob(item.fileData))
      : `/api/materials/${item.id}/file`;

    if (!targetUrl) return;

    // Create a hidden iframe with the URL to trigger browser print dialog
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.src = targetUrl;

    document.body.appendChild(iframe);

    let printed = false;
    const executePrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // If iframe printing is blocked, open in new tab for direct printing
        const newTab = window.open(targetUrl, '_blank');
        if (newTab) {
          newTab.focus();
        }
      }
    };

    iframe.onload = () => {
      setTimeout(executePrint, 400);
    };

    setTimeout(() => {
      if (!printed) executePrint();
    }, 1000);
  } catch (e) {
    console.error('Print error:', e);
  }
}

// Universal Download Function (supports storageUrl, server endpoint, and dataUrl)
export function downloadPdfItem(item: MaterialItem): void {
  try {
    const fallbackUrl = `/api/materials/${item.id}/file`;
    const targetUrl = item.storageUrl || (item.fileData ? URL.createObjectURL(dataUrlToBlob(item.fileData)) : fallbackUrl);

    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = item.fileName.endsWith('.pdf') ? item.fileName : `${item.fileName}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('Download error:', e);
  }
}

// Clear all materials completely from IndexedDB, in-memory cache, and trigger event
export async function clearAllMaterials(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (e) {
    console.warn('Could not clear IndexedDB materials:', e);
  }
  saveFallbackMaterials([]);
  try {
    await fetch('/api/materials/clear', { method: 'POST' });
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

