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
const DELETED_IDS_KEY = 'school_materials_deleted_ids_v1';

export function getLocalDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function addLocalDeletedId(id: string) {
  if (!id) return;
  try {
    const set = getLocalDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Could not store deleted ID:', e);
  }
}

export function removeLocalDeletedId(id: string) {
  if (!id) return;
  try {
    const set = getLocalDeletedIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {
    console.warn('Could not remove deleted ID:', e);
  }
}

export function mergeDeletedIds(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  try {
    const set = getLocalDeletedIds();
    let changed = false;
    for (const id of ids) {
      if (id && !set.has(id)) {
        set.add(id);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {
    console.warn('Could not merge deleted IDs:', e);
  }
}

function getFallbackMaterials(): MaterialItem[] {
  const deletedIds = getLocalDeletedIds();
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    const parsed: MaterialItem[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && m.id && !deletedIds.has(m.id)) : [];
  } catch {
    return [];
  }
}

function saveFallbackMaterials(items: MaterialItem[]) {
  const deletedIds = getLocalDeletedIds();
  const cleanItems = items.filter((m) => m && m.id && !deletedIds.has(m.id));
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(cleanItems));
  } catch (e) {
    console.warn('LocalStorage quota might be exceeded for fallback:', e);
  }
}

// Retrieve all materials (merges local cache and excludes any deleted tombstones)
export async function getAllMaterials(): Promise<MaterialItem[]> {
  const deletedIds = getLocalDeletedIds();
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const rawList: MaterialItem[] = req.result || [];
        const activeList = rawList.filter((m) => m && m.id && !deletedIds.has(m.id));

        // Asynchronously purge any zombie tombstoned items from IndexedDB
        if (rawList.length !== activeList.length) {
          setTimeout(async () => {
            try {
              const writeDb = await openDB();
              const writeTx = writeDb.transaction(STORE_NAME, 'readwrite');
              const writeStore = writeTx.objectStore(STORE_NAME);
              for (const item of rawList) {
                if (item && item.id && deletedIds.has(item.id)) {
                  writeStore.delete(item.id);
                  deleteMaterialBlob(item.id).catch(() => {});
                }
              }
            } catch {}
          }, 0);
        }

        resolve(activeList);
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

// Helper to convert Blob to Data URL
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Seamless Cloud Sync (Mobile ⇄ Laptop Bidirectional Sync with Tombstone Protection)
export async function syncMaterialsFromCloud(): Promise<MaterialItem[]> {
  try {
    const deletedIds = getLocalDeletedIds();

    // 1. Read local materials present on this specific device, excluding deleted items
    const rawLocal = await getAllMaterials();
    const localMaterials = rawLocal.filter((m) => m && m.id && !deletedIds.has(m.id));

    // 2. Prepare items to sync to server, attaching file data from local IndexedDB blobs if needed
    const payloadMaterials = await Promise.all(
      localMaterials.map(async (m) => {
        const itemCopy = { ...m };
        if (!itemCopy.fileUrl && !itemCopy.fileData) {
          try {
            const blob = await getMaterialBlob(itemCopy.id);
            if (blob) {
              itemCopy.fileData = await blobToDataUrl(blob);
            }
          } catch (e) {
            console.warn(`Could not read blob for ${itemCopy.id}:`, e);
          }
        }
        return itemCopy;
      })
    );

    // 3. Bidirectional Sync with Express Server: Pushes device files up & reports deletedIds, pulls remote clean list
    try {
      const res = await fetch('/api/materials/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materials: payloadMaterials,
          deletedIds: Array.from(deletedIds),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.deletedIds)) {
          mergeDeletedIds(data.deletedIds);
        }

        const currentDeleted = getLocalDeletedIds();
        const serverMaterials: MaterialItem[] = Array.isArray(data.materials)
          ? data.materials.filter((m: any) => m && m.id && !currentDeleted.has(m.id))
          : [];

        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // Remove any newly tombstoned items from local storage
        for (const delId of currentDeleted) {
          store.delete(delId);
          deleteMaterialBlob(delId).catch(() => {});
        }

        for (const item of serverMaterials) {
          store.put(item);
          // Only sync to Supabase if NOT deleted
          if (!currentDeleted.has(item.id)) {
            supabaseUpsertMaterial(item).catch(() => {});
          }
        }

        saveFallbackMaterials(serverMaterials);
        window.dispatchEvent(new CustomEvent(EVENT_NAME));
        return serverMaterials;
      }
    } catch (serverSyncErr) {
      console.warn('Express server sync error:', serverSyncErr);
    }

    // 4. Also check Supabase for any remote materials
    try {
      const remoteMaterials = await supabaseFetchMaterials();
      const currentDeleted = getLocalDeletedIds();
      if (remoteMaterials && remoteMaterials.length > 0) {
        const validRemote = remoteMaterials.filter((m) => m && m.id && !currentDeleted.has(m.id));

        // If Supabase returned any items that were deleted on this device/server, delete them from Supabase immediately!
        for (const item of remoteMaterials) {
          if (item && item.id && currentDeleted.has(item.id)) {
            supabaseDeleteMaterial(item.id).catch(() => {});
            if (item.fileUrl) {
              supabaseDeleteMaterialFile(item.fileUrl).catch(() => {});
            }
          }
        }

        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const delId of currentDeleted) {
          store.delete(delId);
          deleteMaterialBlob(delId).catch(() => {});
        }

        for (const item of validRemote) {
          store.put(item);
          if (item.fileData && item.fileData.startsWith('data:')) {
            try {
              const blob = dataUrlToBlob(item.fileData);
              saveMaterialBlob(item.id, blob).catch(() => {});
            } catch {}
          }
        }

        saveFallbackMaterials(validRemote);
        window.dispatchEvent(new CustomEvent(EVENT_NAME));
        return validRemote;
      }
    } catch (supErr) {
      console.warn('Supabase sync notice:', supErr);
    }
  } catch (err) {
    console.warn('Sync materials from cloud error:', err);
  }
  return (await getAllMaterials()).filter((m) => m && m.id && !getLocalDeletedIds().has(m.id));
}

// Save or add a material (Uploads to Supabase Storage + Database + Server + Local IndexedDB)
export async function saveMaterial(item: MaterialItem, originalFile?: File | Blob): Promise<void> {
  // If item was previously deleted, remove from local tombstones on intentional upload
  removeLocalDeletedId(item.id);

  // 1. Cache blob locally first for instant offline preview
  if (originalFile) {
    try {
      await saveMaterialBlob(item.id, originalFile);
    } catch (blobErr) {
      console.warn('Could not cache blob:', blobErr);
    }
  } else if (item.fileData && item.fileData.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(item.fileData);
      await saveMaterialBlob(item.id, blob);
    } catch (blobErr) {
      console.warn('Could not cache blob from dataUrl:', blobErr);
    }
  }

  // 2. Upload to Supabase Storage Bucket if bucket exists
  try {
    if (originalFile) {
      const uploadRes = await supabaseUploadMaterialFile(originalFile, item.fileName || 'document.pdf');
      if (uploadRes.success && uploadRes.publicUrl) {
        item.fileUrl = uploadRes.publicUrl;
        if (item.fileData) delete item.fileData;
      }
    } else if (!item.fileUrl && item.fileData && item.fileData.startsWith('data:')) {
      const blob = dataUrlToBlob(item.fileData);
      const uploadRes = await supabaseUploadMaterialFile(blob, item.fileName || 'document.pdf');
      if (uploadRes.success && uploadRes.publicUrl) {
        item.fileUrl = uploadRes.publicUrl;
        if (item.fileData) delete item.fileData;
      }
    }
  } catch (storageErr) {
    console.warn('Supabase storage upload error, continuing with server sync:', storageErr);
  }

  // 3. Send to Express server endpoint (STRICTLY AWAITED for guaranteed cross-device persistence)
  try {
    const res = await fetch('/api/materials/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.material && data.material.fileUrl) {
        item.fileUrl = data.material.fileUrl;
        if (item.fileData) delete item.fileData;
      }
    }
  } catch (serverErr) {
    console.warn('Server single upload notice:', serverErr);
  }

  // 4. Save to local IndexedDB
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

  // 5. Upload to Supabase database table for cross-device sync
  try {
    await supabaseUpsertMaterial(item);
  } catch (e) {
    console.warn('Supabase upsert material error:', e);
  }

  // Notify components
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

// Delete a material (Permanent Deletion across Supabase Table, Bucket, Express Server, Local IndexedDB & Cache)
export async function deleteMaterial(id: string): Promise<void> {
  if (!id) return;

  // 1. Immediately record in local tombstone registry so this device NEVER resurrects it
  addLocalDeletedId(id);

  // Find item to check for fileUrl
  let targetItem: MaterialItem | undefined;
  try {
    const all = await getAllMaterials();
    targetItem = all.find((m) => m.id === id);
  } catch {}

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
    console.warn('Failed to delete from IndexedDB:', e);
  }

  // 3. Delete local blob
  try {
    await deleteMaterialBlob(id);
  } catch {}

  // 4. Clean fallback localStorage
  try {
    const existing = getFallbackMaterials().filter((m) => m.id !== id);
    saveFallbackMaterials(existing);
  } catch {}

  // 5. Clean secondary materials storage safely without triggering conflicting server save
  try {
    const current = getSavedMaterials().filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}

  // 6. Delete from Supabase Storage Bucket if URL exists
  if (targetItem?.fileUrl) {
    try {
      await supabaseDeleteMaterialFile(targetItem.fileUrl);
    } catch (e) {
      console.warn('Could not delete file from Supabase storage:', e);
    }
  }

  // 7. Delete from Supabase database table
  try {
    await supabaseDeleteMaterial(id);
  } catch (e) {
    console.warn('Supabase delete material error:', e);
  }

  // 8. Delete from Express server (strictly awaited to ensure disk + memory cache + tombstones are committed)
  try {
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.deletedIds)) {
        mergeDeletedIds(data.deletedIds);
      }
    }
  } catch (err) {
    console.warn('Failed to delete material from express server:', err);
  }

  // 9. Notify components
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
  const deletedIds = getLocalDeletedIds();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    const items: MaterialItem[] = Array.isArray(parsed) ? parsed : [];
    return items
      .filter((m: MaterialItem) => m && m.id && !deletedIds.has(m.id) && m.subjectId !== 'religion')
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
  const deletedIds = getLocalDeletedIds();
  const sanitized = materials
    .filter((m) => m && m.id && !deletedIds.has(m.id))
    .map((m) => {
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
      if (Array.isArray(data.deletedIds)) {
        mergeDeletedIds(data.deletedIds);
      }
      const deletedIds = getLocalDeletedIds();
      if (Array.isArray(data.materials)) {
        const clean = data.materials.filter((m: any) => m && m.id && !deletedIds.has(m.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        return clean;
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
  removeLocalDeletedId(newItem.id);
  const updated = [newItem, ...current];
  saveMaterials(updated, true);
  return newItem;
}

export function deleteMaterialItem(id: string): boolean {
  if (!id) return false;
  addLocalDeletedId(id);
  deleteMaterial(id).catch(() => {});
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
  for (const id of ids) {
    if (id) {
      addLocalDeletedId(id);
      deleteMaterial(id).catch(() => {});
    }
  }
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
    const all = await getAllMaterials();
    for (const m of all) {
      if (m && m.id) {
        addLocalDeletedId(m.id);
      }
    }
  } catch {}

  try {
    localStorage.removeItem(FALLBACK_KEY);
    localStorage.removeItem('school_materials_fallback');
    localStorage.removeItem('school_materials_data');
    localStorage.removeItem(STORAGE_KEY);
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
    const res = await fetch('/api/materials/clear', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.deletedIds)) {
        mergeDeletedIds(data.deletedIds);
      }
    }
  } catch {}

  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}


