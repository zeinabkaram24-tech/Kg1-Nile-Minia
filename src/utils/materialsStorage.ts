import { MaterialItem } from '../types';
import { INITIAL_MATERIALS_DATA } from '../data/materialsData';
import { deleteMaterialBlob, deleteMultipleMaterialBlobs } from './materialsDb';
import { isAdminLoggedIn } from './storage';

const STORAGE_KEY = 'g2b_school_materials_v7';

export function getSavedMaterials(): MaterialItem[] {
  try {
    // Clear out old legacy cache keys that contained initial dummy materials
    try {
      localStorage.removeItem('g2b_school_materials_v6');
      localStorage.removeItem('g2b_school_materials_v5');
      localStorage.removeItem('g2b_school_materials_v4');
      localStorage.removeItem('g2b_school_materials_v3');
      localStorage.removeItem('g2b_school_materials_v2');
      localStorage.removeItem('g2b_school_materials_v1');
      localStorage.removeItem('g2b_school_materials');
    } catch {
      // ignore
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const items: MaterialItem[] = Array.isArray(parsed) ? parsed : [];

    const cleaned = items
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

    return cleaned;
  } catch (err) {
    console.error('Failed to load materials from localStorage', err);
    return [];
  }
}

export function saveMaterials(materials: MaterialItem[], asAdmin?: boolean): void {
  // Strip large fileData (>50KB) to prevent localStorage QuotaExceededError
  const sanitized = materials.map((m) => {
    if (m.fileData && m.fileData.length > 50000) {
      const { fileData, ...rest } = m;
      return rest;
    }
    return m;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save materials to localStorage', err);
  }

  // Background sync to server Global Storage: ADMIN ROLE ONLY (Password 1940)
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
