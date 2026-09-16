import { MaterialItem } from '../types';
import { INITIAL_MATERIALS_DATA } from '../data/materialsData';
import {
  getMaterialBlob,
  saveMaterialBlob,
  deleteMaterialBlob,
  deleteMultipleMaterialBlobs,
  clearAllMaterialBlobs,
} from './materialsDb';
import { isAdminLoggedIn } from './storage';
import {
  supabaseFetchMaterials,
  supabaseUpsertMaterial,
  supabaseDeleteMaterial,
  supabaseClearAllMaterials,
  supabaseUploadMaterialFile,
  supabaseDeleteMaterialFile,
} from '../services/supabaseService';

const DB_NAME = 'SchoolMaterialsDB';
const STORE_NAME = 'materials';
const DB_VERSION = 1;
const EVENT_NAME = 'school_materials_updated';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
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

// Fallback in localStorage if IndexedDB has issues
const FALLBACK_KEY = 'school_materials_fallback';

function getFallbackMaterials(): MaterialItem[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFallbackMaterials(items: MaterialItem[]) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage quota might be exceeded for fallback:', e);
  }
}

// Retrieve all materials (merges local cache and triggers cloud sync)
export async function getAllMaterials(): Promise<MaterialItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
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
    console.warn('IndexedDB failed, using fallback', e);
    return getFallbackMaterials();
  }
}

// Seamless Cloud Sync (Mobile ⇄ Laptop)
export async function syncMaterialsFromCloud(): Promise<MaterialItem[]> {
  try {
    // 1. Try Supabase first
    const remoteMaterials = await supabaseFetchMaterials();
    if (remoteMaterials && remoteMaterials.length > 0) {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const item of remoteMaterials) {
        store.put(item);
        if (item.fileData && item.fileData.startsWith('data:')) {
          try {
            const blob = dataUrlToBlob(item.fileData);
            saveMaterialBlob(item.id, blob).catch(() => {});
          } catch {}
        }
      }
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
      return remoteMaterials;
    }

    // 2. Fallback to Express Server API (/api/materials)
    const res = await fetch('/api/materials');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.materials) && data.materials.length > 0) {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const item of data.materials) {
          store.put(item);
          if (item.fileData && item.fileData.startsWith('data:')) {
            try {
              const blob = dataUrlToBlob(item.fileData);
              saveMaterialBlob(item.id, blob).catch(() => {});
            } catch {}
          }
        }
        window.dispatchEvent(new CustomEvent(EVENT_NAME));
        return data.materials;
      }
    }
  } catch (err) {
    console.warn('Sync materials from cloud error:', err);
  }
  return getAllMaterials();
}

// Save or add a material (Uploads to Supabase Storage + Database + Server + Local IndexedDB)
export async function saveMaterial(item: MaterialItem, originalFile?: File | Blob): Promise<void> {
  // 1. Upload to Supabase Storage Bucket ('materials') for permanent direct cloud URL (Mobile ⇄ Laptop)
  let uploadedUrl: string | undefined = item.fileUrl;
  try {
    if (originalFile) {
      const uploadRes = await supabaseUploadMaterialFile(originalFile, item.fileName || 'document.pdf');
      if (uploadRes.success && uploadRes.publicUrl) {
        uploadedUrl = uploadRes.publicUrl;
        item.fileUrl = uploadRes.publicUrl;
      }
    } else if (!uploadedUrl && item.fileData && item.fileData.startsWith('data:')) {
      const blob = dataUrlToBlob(item.fileData);
      const uploadRes = await supabaseUploadMaterialFile(blob, item.fileName || 'document.pdf');
      if (uploadRes.success && uploadRes.publicUrl) {
        uploadedUrl = uploadRes.publicUrl;
        item.fileUrl = uploadRes.publicUrl;
      }
    }
  } catch (storageErr) {
    console.warn('Supabase storage upload error, continuing with database sync:', storageErr);
  }

  // 2. Save to local IndexedDB
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

  // 3. Cache blob locally if fileData is present
  if (item.fileData && item.fileData.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(item.fileData);
      saveMaterialBlob(item.id, blob).catch(() => {});
    } catch {}
  } else if (originalFile) {
    try {
      saveMaterialBlob(item.id, originalFile).catch(() => {});
    } catch {}
  }

  // 4. Upload to Supabase database table with direct public URL for instant cross-device sync
  try {
    await supabaseUpsertMaterial(item);
  } catch (e) {
    console.warn('Supabase upsert material error:', e);
  }

  // 5. Send to Express server endpoint
  try {
    fetch('/api/materials/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(() => {});
  } catch {}

  // Notify components
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// Delete a material (Deletes from Storage Bucket + Database + Server + Local)
export async function deleteMaterial(id: string): Promise<void> {
  // Find item to check for fileUrl
  let targetItem: MaterialItem | undefined;
  try {
    const all = await getAllMaterials();
    targetItem = all.find((m) => m.id === id);
  } catch {}

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

  // 2. Delete local blob
  deleteMaterialBlob(id).catch(() => {});

  // 3. Delete from Supabase Storage Bucket if URL exists
  if (targetItem?.fileUrl) {
    try {
      await supabaseDeleteMaterialFile(targetItem.fileUrl);
    } catch (e) {
      console.warn('Could not delete file from Supabase storage:', e);
    }
  }

  // 4. Delete from Supabase database table
  try {
    await supabaseDeleteMaterial(id);
  } catch (e) {
    console.warn('Supabase delete material error:', e);
  }

  // 5. Delete from Server
  try {
    fetch(`/api/materials/${id}`, { method: 'DELETE' }).catch(() => {});
  } catch {}

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

// Resolve Blob for MaterialItem safely
export async function getMaterialItemBlob(item: MaterialItem): Promise<Blob | null> {
  try {
    const dbBlob = await getMaterialBlob(item.id);
    if (dbBlob) return dbBlob;
  } catch (e) {
    console.warn('Could not retrieve blob from IndexedDB:', e);
  }

  if (item.fileData) {
    try {
      if (item.fileData.startsWith('data:')) {
        return dataUrlToBlob(item.fileData);
      }
    } catch (e) {
      console.warn('Could not parse dataUrl:', e);
    }
  }

  if (item.fileUrl) {
    try {
      const res = await fetch(item.fileUrl);
      if (res.ok) return await res.blob();
    } catch (e) {
      console.warn('Could not fetch fileUrl:', e);
    }
  }

  return null;
}

// Open PDF Directly in a new browser tab or fallback
export async function openPdfItem(item: MaterialItem): Promise<void> {
  try {
    const blob = await getMaterialItemBlob(item);
    const blobUrl = blob ? URL.createObjectURL(blob) : item.fileUrl || null;
    if (!blobUrl) return;

    const newWin = window.open(blobUrl, '_blank');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    console.error('Error opening PDF:', e);
  }
}

// Universal Print Function for PDF item
export async function printPdfItem(item: MaterialItem): Promise<void> {
  try {
    const blob = await getMaterialItemBlob(item);
    const blobUrl = blob ? URL.createObjectURL(blob) : item.fileUrl || null;
    if (!blobUrl) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    let printed = false;
    const executePrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        const newTab = window.open(blobUrl, '_blank');
        if (newTab) newTab.focus();
      }
    };

    iframe.onload = () => {
      setTimeout(executePrint, 300);
    };

    setTimeout(() => {
      if (!printed) executePrint();
    }, 800);
  } catch (e) {
    console.error('Print error:', e);
  }
}

// Universal Download Function
export async function downloadPdfItem(item: MaterialItem): Promise<void> {
  try {
    const blob = await getMaterialItemBlob(item);
    const blobUrl = blob ? URL.createObjectURL(blob) : item.fileUrl || null;
    if (!blobUrl) return;

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.fileName?.endsWith('.pdf') ? item.fileName : `${item.fileName || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (blob) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    }
  } catch (e) {
    console.error('Download error:', e);
  }
}

const STORAGE_KEY = 'g2b_school_materials_v7';

export function getSavedMaterials(): MaterialItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    const items: MaterialItem[] = Array.isArray(parsed) ? parsed : [];
    return items
      .filter((m: MaterialItem) => m && m.subjectId !== 'religion')
      .map((m: MaterialItem) => {
        const updated = { ...m };
        if (m.category === 'main_sheets' || m.categoryLabel === 'الشيتات الرئيسية') {
          updated.categoryLabel = 'Main Sheets';
        } else if (m.category === 'week1' || m.categoryLabel === 'ويك 1') {
          updated.categoryLabel = 'Week 1';
        } else if (m.category === 'week2' || m.categoryLabel === 'ويك 2') {
          updated.categoryLabel = 'Week 2';
        } else if (m.category === 'week3' || m.categoryLabel === 'ويك 3') {
          updated.categoryLabel = 'Week 3';
        }
        return updated;
      });
  } catch (err) {
    console.error('Failed to load materials from localStorage', err);
    return [];
  }
}

export function saveMaterials(materials: MaterialItem[], asAdmin?: boolean): void {
  const sanitized = materials.map((m) => {
    if (m.fileData && m.fileData.length > 50000) {
      const { fileData, ...rest } = m;
      return rest;
    }
    return m;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch (err) {
    console.error('Failed to save materials to localStorage', err);
  }

  const isAuthorizedAdmin = asAdmin === true || isAdminLoggedIn();
  if (isAuthorizedAdmin) {
    try {
      fetch('/api/materials/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materials: sanitized,
          isAdmin: true,
          pin: '1940',
        }),
      }).catch((e) => console.warn('Notice: Admin sync materials to server:', e));
    } catch {
      // Offline ignore
    }
  }
}

export async function syncMaterialsFromServer(): Promise<MaterialItem[]> {
  try {
    const res = await fetch('/api/materials');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.materials)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.materials));
        return data.materials;
      }
    }
  } catch (err) {
    console.warn('Cannot fetch materials from server:', err);
  }
  return getSavedMaterials();
}

export function addMaterialItem(item: Omit<MaterialItem, 'id' | 'createdAt'>): MaterialItem {
  const current = getSavedMaterials();
  const newItem: MaterialItem = {
    ...item,
    id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: Date.now(),
  };
  const updated = [newItem, ...current];
  saveMaterials(updated, true);
  return newItem;
}

export function deleteMaterialItem(id: string): boolean {
  const current = getSavedMaterials();
  const updated = current.filter((m) => m.id !== id);
  saveMaterials(updated, true);
  deleteMaterialBlob(id);
  return true;
}

export function updateMaterialItem(id: string, updates: Partial<MaterialItem>): MaterialItem | null {
  const current = getSavedMaterials();
  let updatedItem: MaterialItem | null = null;
  const updated = current.map((m) => {
    if (m.id === id) {
      updatedItem = { ...m, ...updates };
      return updatedItem;
    }
    return m;
  });
  if (updatedItem) {
    saveMaterials(updated, true);
  }
  return updatedItem;
}

export function deleteMultipleMaterialItems(ids: string[]): boolean {
  if (!ids || ids.length === 0) return false;
  const idSet = new Set(ids);
  const current = getSavedMaterials();
  const updated = current.filter((m) => !idSet.has(m.id));
  saveMaterials(updated, true);
  deleteMultipleMaterialBlobs(ids);
  return true;
}

export function resetToDefaultMaterials(): MaterialItem[] {
  saveMaterials(INITIAL_MATERIALS_DATA);
  return INITIAL_MATERIALS_DATA;
}

export async function clearAllMaterialsStorage(): Promise<void> {
  try {
    localStorage.removeItem(FALLBACK_KEY);
    localStorage.removeItem('school_materials_fallback');
    localStorage.removeItem('school_materials_data');
  } catch (e) {
    console.error('Failed to clear localStorage materials:', e);
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to clear IndexedDB materials store:', e);
  }

  await clearAllMaterialBlobs();

  try {
    await supabaseClearAllMaterials();
  } catch (e) {
    console.warn('Supabase clear materials error:', e);
  }

  try {
    fetch('/api/materials/clear', { method: 'POST' }).catch(() => {});
  } catch {}

  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}


