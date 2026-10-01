import { MaterialItem } from '../types';
export type { MaterialItem };
import {
  isSupabaseConfigured,
  fetchAllMaterialsFromSupabase,
  saveMaterialToSupabase,
  deleteMaterialFromSupabase,
  clearAllMaterialsFromSupabase,
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

// Retrieve all materials (strictly Supabase-authoritative when online to ensure all devices display identical content, offline fallback only)
export async function getAllMaterials(): Promise<MaterialItem[]> {
  // 1. Direct Supabase Cloud Fetch (Authoritative & Unified across all devices/domains)
  if (isSupabaseConfigured) {
    try {
      const dbItems = await fetchAllMaterialsFromSupabase();
      if (Array.isArray(dbItems) && dbItems.length > 0) {
        // Online Sync: Overwrite local IndexedDB with Supabase items so they match 100%
        try {
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          for (const item of dbItems) {
            store.put(item);
          }
        } catch (dbErr) {
          console.warn('Failed to overwrite local IndexedDB cache with Supabase items:', dbErr);
        }

        saveFallbackMaterials(dbItems);
        return dbItems;
      }
    } catch (sbErr) {
      console.warn('Direct Supabase fetch materials failed, checking server API:', sbErr);
    }
  }

  // 2. Try to fetch from the central server API as secondary online source
  try {
    const res = await fetch('/api/materials');
    if (res.ok) {
      const serverItems: MaterialItem[] = await res.json();
      if (Array.isArray(serverItems) && serverItems.length > 0) {
        try {
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          for (const item of serverItems) {
            store.put(item);
          }
        } catch {}

        saveFallbackMaterials(serverItems);
        return serverItems;
      }
    }
  } catch (err) {
    console.warn('Failed to load materials from server API, using offline fallback:', err);
  }

  // 3. Offline Fallback: Load from local IndexedDB ONLY if the server/network is completely unreachable!
  try {
    const db = await openDB();
    const localItems = await new Promise<MaterialItem[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    if (localItems.length > 0) {
      return localItems;
    }
  } catch (e) {
    console.warn('IndexedDB offline read failed:', e);
  }

  return getFallbackMaterials();
}

// Save or add a material (saves directly to Supabase Cloud, locally, and to central server)
export async function saveMaterial(item: MaterialItem): Promise<void> {
  // 1. Direct Supabase Cloud Save (Guaranteed sync across all devices, just like classwork)
  if (isSupabaseConfigured) {
    try {
      await saveMaterialToSupabase(item);
    } catch (err) {
      console.warn('Failed to sync material to Supabase cloud:', err);
    }
  }

  // 2. Save to local IndexedDB for instant offline access
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

  // 3. Secondary server persistence (/api/materials)
  try {
    const itemToSync = { ...item };
    await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemToSync),
    });
  } catch (serverErr) {
    console.warn('Failed to sync material to server API:', serverErr);
  }

  // Notify components across app
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
  window.dispatchEvent(new CustomEvent('materials_updated'));
}

// Delete a material (deletes from Supabase Cloud, locally, and central server)
export async function deleteMaterial(id: string, storageUrl?: string): Promise<void> {
  // 1. Direct Supabase Cloud Delete
  if (isSupabaseConfigured) {
    try {
      await deleteMaterialFromSupabase(id);
    } catch (err) {
      console.warn('Failed to delete material from Supabase cloud:', err);
    }
  }

  // 2. Delete from local IndexedDB
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

  // 3. Delete from centralized server
  try {
    await fetch(`/api/materials/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (serverErr) {
    console.warn('Failed to delete material from server API:', serverErr);
  }

  // Notify components
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
  window.dispatchEvent(new CustomEvent('materials_updated'));
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
export function formatBytes(bytes: number | string | undefined | null, decimals = 1): string {
  const num = typeof bytes === 'string' ? parseFloat(bytes) : Number(bytes || 0);
  if (!num || isNaN(num) || num <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return `${parseFloat((num / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
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

// Clear all materials completely from IndexedDB, Supabase, and in-memory cache, and trigger event
export async function clearAllMaterials(): Promise<void> {
  // 1. Clear Supabase
  if (isSupabaseConfigured) {
    try {
      await clearAllMaterialsFromSupabase();
    } catch (err) {
      console.warn('Failed to clear materials from Supabase:', err);
    }
  }

  // 2. Clear IndexedDB
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
    window.dispatchEvent(new CustomEvent('materials_updated'));
  }
}

export const getSavedMaterials = getAllMaterials;
export function addMaterialItem(item: any): any {
  saveMaterial(item).catch(() => {});
  return item;
}
export function updateMaterialItem(idOrItem: any, maybeItem?: any): any {
  const item = maybeItem ? { ...maybeItem, id: idOrItem } : idOrItem;
  saveMaterial(item).catch(() => {});
  return item;
}
export const deleteMaterialItem = deleteMaterial;
export async function deleteMultipleMaterialItems(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteMaterial(id);
  }
}
export async function resetToDefaultMaterials(): Promise<void> {
  await clearAllMaterials();
}


