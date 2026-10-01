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

// Instant localStorage cache for 0ms initial render
const LOCAL_STORAGE_MATERIALS_CACHE = 'nile_materials_cache_v2';

export function getInstantMaterials(): MaterialItem[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_MATERIALS_CACHE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

export const getFallbackMaterials = getInstantMaterials;

export function saveFallbackMaterials(items: MaterialItem[]) {
  try {
    const cleanList = items.map((item) => {
      const copy = { ...item };
      delete copy.fileData; // Keep cache lightweight (< 15KB)
      return copy;
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_MATERIALS_CACHE, JSON.stringify(cleanList));
    }
  } catch (e) {
    console.warn('LocalStorage materials cache notice:', e);
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

// Retrieve all materials (ultra-fast metadata query, < 50ms, with instant cache fallback)
export async function getAllMaterials(): Promise<MaterialItem[]> {
  // 1. Direct Supabase Cloud Fetch (Lightweight metadata only < 50ms)
  if (isSupabaseConfigured) {
    try {
      const dbItems = await fetchAllMaterialsFromSupabase();
      if (Array.isArray(dbItems)) {
        saveFallbackMaterials(dbItems);
        // Async update IndexedDB in background without blocking UI
        saveItemsToLocalDB(dbItems).catch(() => {});
        return dbItems;
      }
    } catch (sbErr) {
      console.warn('Direct Supabase fetch materials notice, checking server API:', sbErr);
    }
  }

  // 2. Try to fetch from the central server API as secondary online source
  try {
    const res = await fetch('/api/materials');
    if (res.ok) {
      const serverItems: MaterialItem[] = await res.json();
      if (Array.isArray(serverItems)) {
        saveFallbackMaterials(serverItems);
        saveItemsToLocalDB(serverItems).catch(() => {});
        return serverItems;
      }
    }
  } catch (err) {
    console.warn('Server materials fetch notice:', err);
  }

  // 3. Instant local fallback from cache
  const cached = getInstantMaterials();
  if (cached.length > 0) {
    return cached;
  }

  return [];
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
        (m.id && urlOrName.includes(m.id)) ||
        (m.fileName && urlOrName.includes(m.fileName))
    );
    if (found) return found;

    const match = urlOrName.match(/\/api\/materials\/([^/]+)\/file/);
    if (match && match[1]) {
      return {
        id: match[1],
        fileName: defaultTitle || 'ملف PDF مرفق.pdf',
        fileSize: 0,
        block: 1,
        section: 'General',
        classId: 'ALL',
        type: 'pdf',
        storageUrl: urlOrName,
        uploadedAt: new Date().toISOString(),
      };
    }
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

// Get guaranteed viewable URL for any PDF item (safe for iframes, objects, and new tabs)
export function getPdfViewableUrl(item: MaterialItem): string {
  // 1. External Link
  if (item.type === 'link' || (item.linkUrl && !item.linkUrl.toLowerCase().endsWith('.pdf'))) {
    return item.linkUrl || item.storageUrl || '';
  }
  // 2. Full HTTP(S) URL
  if (item.storageUrl && (item.storageUrl.startsWith('http://') || item.storageUrl.startsWith('https://'))) {
    return item.storageUrl;
  }
  // 3. Server file endpoint
  if (item.id) {
    return `/api/materials/${item.id}/file`;
  }
  // 4. Blob URL from fileData base64 if available
  if (item.fileData && typeof item.fileData === 'string' && item.fileData.includes(',')) {
    try {
      const blob = dataUrlToBlob(item.fileData);
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('Failed to create blob from fileData:', e);
    }
  }
  return item.storageUrl || '';
}

// Open PDF or Link directly in our guaranteed In-App Viewer Modal or native browser reader
export function openPdfItem(item: MaterialItem): void {
  try {
    // If it's a web link, open immediately in new tab
    if (item.type === 'link' || (item.linkUrl && !item.linkUrl.toLowerCase().endsWith('.pdf'))) {
      const targetUrl = item.linkUrl || item.storageUrl;
      if (targetUrl) {
        window.open(targetUrl, '_blank');
        return;
      }
    }

    const viewableUrl = getPdfViewableUrl(item);

    // On mobile screens (iPhone/Android), opening the PDF directly in a new tab provides the native, full-fidelity PDF reader
    const isMobile = typeof window !== 'undefined' && (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );

    if (isMobile && viewableUrl) {
      const win = window.open(viewableUrl, '_blank');
      if (win) {
        return;
      }
    }

    // Dispatch custom event to open In-App PDF Viewer Modal directly in place
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('open_pdf_viewer_modal', {
          detail: {
            ...item,
            viewableUrl,
          },
        })
      );
    }
  } catch (e) {
    console.error('Error opening PDF in modal:', e);
  }
}

// Universal Print Function for PDF item
export function printPdfItem(item: MaterialItem): void {
  try {
    const targetUrl = getPdfViewableUrl(item);
    if (!targetUrl) return;

    // Direct open for printing
    const win = window.open(targetUrl, '_blank');
    if (win) {
      win.focus();
      setTimeout(() => {
        try { win.print(); } catch {}
      }, 500);
      return;
    }

    // Fallback: create hidden iframe
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

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {}
      }, 400);
    };
  } catch (e) {
    console.error('Print error:', e);
  }
}

// Universal Download Function (supports storageUrl, server endpoint, and dataUrl)
export function downloadPdfItem(item: MaterialItem): void {
  try {
    const fileName = item.fileName.endsWith('.pdf') ? item.fileName : `${item.fileName}.pdf`;
    
    // If fileData is present, download via Blob (instant, offline-capable)
    if (item.fileData && typeof item.fileData === 'string' && item.fileData.includes(',')) {
      const blob = dataUrlToBlob(item.fileData);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return;
    }

    // Otherwise download from server endpoint or storageUrl
    const targetUrl = item.id ? `/api/materials/${item.id}/file` : (item.storageUrl || '');
    if (targetUrl) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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


