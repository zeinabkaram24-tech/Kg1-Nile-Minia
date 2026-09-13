import { MaterialItem } from '../types';
import { INITIAL_MATERIALS_DATA } from '../data/materialsData';
import { deleteMaterialBlob, deleteMultipleMaterialBlobs, clearAllMaterialBlobs } from './materialsDb';
import { isAdminLoggedIn } from './storage';

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

// Retrieve all materials
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

// Save or add a material
export async function saveMaterial(item: MaterialItem): Promise<void> {
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

  // Notify components
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// Delete a material
export async function deleteMaterial(id: string): Promise<void> {
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

// Open PDF Directly in a new browser tab (No modal, opens natively)
export function openPdfItem(item: MaterialItem): void {
  try {
    const blob = dataUrlToBlob(item.fileData);
    const blobUrl = URL.createObjectURL(blob);

    // Attempt direct window.open first
    const newWin = window.open(blobUrl, '_blank');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      // Fallback via anchor click if window.open was intercepted
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
export function printPdfItem(item: MaterialItem): void {
  try {
    const blob = dataUrlToBlob(item.fileData);
    const blobUrl = URL.createObjectURL(blob);

    // Create a hidden iframe with the blob URL to trigger browser print dialog
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
        // If iframe printing is blocked, open in new tab for direct printing
        const newTab = window.open(blobUrl, '_blank');
        if (newTab) {
          newTab.focus();
        }
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
export function downloadPdfItem(item: MaterialItem): void {
  try {
    const blob = dataUrlToBlob(item.fileData);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.fileName?.endsWith('.pdf') ? item.fileName : `${item.fileName || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
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
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}


