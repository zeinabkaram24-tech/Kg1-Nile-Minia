import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ClassId, ClassworkEntry, HomeworkEntry, SchoolDay, SubjectName, MaterialItem } from '../types';
import { INITIAL_CLASSWORK, INITIAL_HOMEWORK } from '../data/defaultWeeklyPlan';
import initialData from '../data/initialData.json';

export function cleanSupabaseUrl(rawUrl: string): string {
  let cleaned = (rawUrl || '').trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return '';

  try {
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    const parsed = new URL(cleaned);
    // If it is a Supabase project domain (e.g. xyz.supabase.co/rest/v1 or xyz.supabase.co/)
    if (parsed.hostname.endsWith('.supabase.co')) {
      return parsed.origin;
    }
    // For custom or self-hosted domains, strip /rest/v1 or trailing slashes
    return cleaned.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  } catch {
    return cleaned.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }
}

export function cleanSupabaseKey(rawKey: string): string {
  return (rawKey || '').trim().replace(/^["']|["']$/g, '');
}

export const STORAGE_KEYS_SUPABASE = {
  URL: 'nile_supabase_url',
  KEY: 'nile_supabase_anon_key',
};

export const DEFAULT_SUPABASE_URL = 'https://umryrjwmlkdbjmgmnbkt.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_nVMt4oGVfTD9TVyDB4HPag_maw8OXag';

export function getActiveSupabaseConfig(): { url: string; key: string } {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem(STORAGE_KEYS_SUPABASE.URL);
    const savedKey = localStorage.getItem(STORAGE_KEYS_SUPABASE.KEY);
    if (savedUrl && savedKey && savedUrl.trim() !== '' && savedKey.trim() !== '') {
      return {
        url: cleanSupabaseUrl(savedUrl),
        key: cleanSupabaseKey(savedKey),
      };
    }
  }
  // Fall back to environment variable or central default if not saved locally
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;
  return {
    url: cleanSupabaseUrl(url),
    key: cleanSupabaseKey(key),
  };
}

export function saveActiveSupabaseConfig(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS_SUPABASE.URL, cleanSupabaseUrl(url));
    localStorage.setItem(STORAGE_KEYS_SUPABASE.KEY, cleanSupabaseKey(key));
    window.dispatchEvent(new Event('supabase_config_updated'));
  }
}

const initialConfig = getActiveSupabaseConfig();
export let supabaseUrl = initialConfig.url;
export let supabaseAnonKey = initialConfig.key;

export let isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== '' &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseUrl.includes('placeholder')
);

export let supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export function updateSupabaseClient(url: string, key: string): SupabaseClient {
  const cleanedUrl = cleanSupabaseUrl(url);
  const cleanedKey = cleanSupabaseKey(key);
  saveActiveSupabaseConfig(cleanedUrl, cleanedKey);
  supabaseUrl = cleanedUrl;
  supabaseAnonKey = cleanedKey;
  isSupabaseConfigured = Boolean(
    cleanedUrl &&
      cleanedKey &&
      cleanedUrl.trim() !== '' &&
      cleanedKey.trim() !== '' &&
      cleanedUrl !== 'https://your-project.supabase.co' &&
      !cleanedUrl.includes('placeholder')
  );
  supabase = createClient(
    cleanedUrl || 'https://placeholder.supabase.co',
    cleanedKey || 'placeholder'
  );
  return supabase;
}

export function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    Promise.resolve(promise)
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

export async function syncSupabaseConfigWithServer(): Promise<boolean> {
  try {
    const localUrl = localStorage.getItem(STORAGE_KEYS_SUPABASE.URL) || '';
    const localKey = localStorage.getItem(STORAGE_KEYS_SUPABASE.KEY) || '';
    
    // Check server-side Supabase credentials with timeout
    const res = await withTimeout(fetch('/api/supabase-config'), 2500, null as any);
    let hasUpdatedLocal = false;
    if (res && res.ok) {
      const srvConfig = await res.json();
      if (srvConfig && srvConfig.url && srvConfig.key) {
        const cleanedUrl = cleanSupabaseUrl(srvConfig.url);
        const cleanedKey = cleanSupabaseKey(srvConfig.key);
        
        if (cleanedUrl && cleanedKey && (cleanedUrl !== localUrl || cleanedKey !== localKey)) {
          console.log('[Supabase Sync] Replicating Supabase config from centralized server...');
          saveActiveSupabaseConfig(cleanedUrl, cleanedKey);
          supabaseUrl = cleanedUrl;
          supabaseAnonKey = cleanedKey;
          isSupabaseConfigured = true;
          supabase = createClient(supabaseUrl, supabaseAnonKey);
          
          window.dispatchEvent(new Event('supabase_config_updated'));
          hasUpdatedLocal = true;
        }
      } else if (localUrl && localKey && localUrl.trim() !== '' && !localUrl.includes('placeholder')) {
        // If server is unconfigured, but client has config, upload it to the server in background
        fetch('/api/supabase-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: localUrl, key: localKey }),
        }).catch(() => {});
      }
    }
    
    return hasUpdatedLocal;
  } catch (e) {
    console.warn('[Supabase Sync] Could not fetch/sync shared config:', e);
  }
  return false;
}

export async function syncLocalDataToServer(): Promise<void> {
  // Disabled auto-reupload to prevent stale local cache from resurrecting wiped data
}

// Database Row Types (snake_case in Supabase)
export interface ClassworkRow {
  id: string;
  class_id: string;
  day: string;
  period: number;
  subject: string;
  title: string;
  details: string | null;
  pages: string | null;
  completed: boolean;
  block: number;
  week: number;
  link_url: string | null;
  link_title: string | null;
  created_at?: string;
}

export interface HomeworkRow {
  id: string;
  class_id: string;
  assigned_day: string;
  due_day: string;
  subject: string;
  task: string;
  details: string | null;
  pages: string | null;
  completed: boolean;
  priority: string;
  block: number;
  week: number;
  is_link_task: boolean;
  link_url: string | null;
  created_at?: string;
}

export interface StudentProgressRow {
  student_name: string;
  class_id: string | null;
  completed_classwork_ids: string[];
  completed_homework_ids: string[];
  last_active: number;
}

// Convert from Row to ClassworkEntry
export function rowToClasswork(row: ClassworkRow): ClassworkEntry {
  // Find matching baseline entry to preserve multiple links if available
  const baseline = INITIAL_CLASSWORK.find(
    (b) =>
      b.id === row.id ||
      (b.day === row.day &&
        b.period === row.period &&
        b.subject === row.subject &&
        (b.week || 1) === (row.week || 1) &&
        (b.block || 1) === (row.block || 1))
  );

  let links = (row as any).links;
  if ((!links || (Array.isArray(links) && links.length === 0)) && (row as any).link_urls_json) {
    try {
      links = JSON.parse((row as any).link_urls_json);
    } catch {}
  }
  if ((!links || (Array.isArray(links) && links.length === 0)) && baseline?.links && baseline.links.length > 0) {
    links = baseline.links;
  }

  return {
    id: row.id,
    classId: row.class_id as ClassId,
    day: row.day as SchoolDay,
    period: row.period,
    subject: row.subject as SubjectName,
    title: row.title,
    details: row.details || undefined,
    pages: row.pages || undefined,
    completed: Boolean(row.completed),
    block: row.block || 1,
    week: row.week || 1,
    linkUrl: row.link_url || baseline?.linkUrl || undefined,
    linkTitle: row.link_title || baseline?.linkTitle || undefined,
    links: links && Array.isArray(links) && links.length > 0 ? links : undefined,
  };
}

// Convert from ClassworkEntry to Row
export function classworkToRow(entry: ClassworkEntry): Omit<ClassworkRow, 'created_at'> {
  return {
    id: entry.id,
    class_id: entry.classId,
    day: entry.day,
    period: entry.period,
    subject: entry.subject,
    title: entry.title,
    details: entry.details || null,
    pages: entry.pages || null,
    completed: Boolean(entry.completed),
    block: entry.block || 1,
    week: entry.week || 1,
    link_url: entry.linkUrl || null,
    link_title: entry.linkTitle || null,
  };
}

// Helper to pack and unpack homework details to support storing pdfUrl in details column without DB schema change
export function unpackHomeworkDetails(detailsStr?: string | null) {
  if (!detailsStr) return { details: undefined, pdfUrl: undefined };
  const parts = detailsStr.split('||PDF_URL:');
  return {
    details: parts[0]?.trim() || undefined,
    pdfUrl: parts[1]?.trim() || undefined,
  };
}

export function packHomeworkDetails(details?: string, pdfUrl?: string) {
  let res = details?.trim() || '';
  if (pdfUrl) {
    res += ` ||PDF_URL:${pdfUrl.trim()}`;
  }
  return res || undefined;
}

// Convert from Row to HomeworkEntry
export function rowToHomework(row: HomeworkRow): HomeworkEntry {
  const unpacked = unpackHomeworkDetails(row.details);
  const baseline = INITIAL_HOMEWORK.find(
    (b) =>
      b.id === row.id ||
      (b.assignedDay === row.assigned_day &&
        b.subject === row.subject &&
        (b.week || 1) === (row.week || 1) &&
        (b.block || 1) === (row.block || 1))
  );

  let links = (row as any).links;
  if ((!links || (Array.isArray(links) && links.length === 0)) && baseline?.links && baseline.links.length > 0) {
    links = baseline.links;
  }

  return {
    id: row.id,
    classId: row.class_id as ClassId,
    assignedDay: row.assigned_day as SchoolDay,
    dueDay: row.due_day as SchoolDay,
    subject: row.subject as SubjectName,
    task: row.task,
    details: unpacked.details,
    pages: row.pages || undefined,
    completed: Boolean(row.completed),
    priority: (row.priority as 'normal' | 'urgent') || 'normal',
    block: row.block || 1,
    week: row.week || 1,
    isLinkTask: Boolean(row.is_link_task),
    linkUrl: row.link_url || baseline?.linkUrl || undefined,
    linkTitle: baseline?.linkTitle || undefined,
    links: links && Array.isArray(links) && links.length > 0 ? links : undefined,
    pdfUrl: unpacked.pdfUrl,
  };
}

// Convert from HomeworkEntry to Row
export function homeworkToRow(entry: HomeworkEntry): Omit<HomeworkRow, 'created_at'> {
  return {
    id: entry.id,
    class_id: entry.classId,
    assigned_day: entry.assignedDay,
    due_day: entry.dueDay,
    subject: entry.subject,
    task: entry.task,
    details: packHomeworkDetails(entry.details, entry.pdfUrl) || null,
    pages: entry.pages || null,
    completed: Boolean(entry.completed),
    priority: entry.priority || 'normal',
    block: entry.block || 1,
    week: entry.week || 1,
    is_link_task: Boolean(entry.isLinkTask),
    link_url: entry.linkUrl || null,
  };
}

// Local persistence keys for offline and unconfigured Supabase environments
const LOCAL_STORAGE_CUSTOM_CLASSWORK = 'nile_planner_custom_classwork';
const LOCAL_STORAGE_CUSTOM_HOMEWORK = 'nile_planner_custom_homework';

// Remove obsolete historical planner keys if any exist
if (typeof window !== 'undefined') {
  try {
    const obsoleteKeys = [
      'nile_planner_custom_classwork',
      'nile_planner_custom_homework',
      'nile_planner_custom_classwork_v2',
      'nile_planner_custom_homework_v2',
      'nile_planner_guest_progress_v2',
      'school_materials_fallback',
    ];
    obsoleteKeys.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {}
}

export const appStorage = {
  getItem: (k: string) => {
    try {
      return typeof window !== 'undefined' ? window.localStorage?.getItem(k) : null;
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage?.setItem(k, v);
    } catch {}
  },
  removeItem: (k: string) => {
    try {
      if (typeof window !== 'undefined') window.localStorage?.removeItem(k);
    } catch {}
  },
};

const LOCAL_CUSTOM_HW_KEY = 'homework_planner_custom_entries_v3';
const LOCAL_CUSTOM_CW_KEY = 'classwork_planner_custom_entries_v3';

export function getLocalCustomClasswork(): ClassworkEntry[] {
  try {
    const raw = appStorage.getItem(LOCAL_CUSTOM_CW_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalCustomClasswork(entries: ClassworkEntry[], mode: 'merge' | 'replace' = 'merge') {
  try {
    if (mode === 'replace') {
      appStorage.setItem(LOCAL_CUSTOM_CW_KEY, JSON.stringify(entries));
      return;
    }
    const current = getLocalCustomClasswork();
    const map = new Map<string, ClassworkEntry>();
    current.forEach((c) => { if (c && c.id) map.set(c.id, c); });
    entries.forEach((c) => { if (c && c.id) map.set(c.id, c); });
    appStorage.setItem(LOCAL_CUSTOM_CW_KEY, JSON.stringify(Array.from(map.values())));
  } catch {}
}

export function getLocalCustomHomework(): HomeworkEntry[] {
  try {
    const raw = appStorage.getItem(LOCAL_CUSTOM_HW_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalCustomHomework(entries: HomeworkEntry[], mode: 'merge' | 'replace' = 'merge') {
  try {
    if (mode === 'replace') {
      appStorage.setItem(LOCAL_CUSTOM_HW_KEY, JSON.stringify(entries));
      return;
    }
    const current = getLocalCustomHomework();
    const map = new Map<string, HomeworkEntry>();
    current.forEach((h) => { if (h && h.id) map.set(h.id, h); });
    entries.forEach((h) => { if (h && h.id) map.set(h.id, h); });
    appStorage.setItem(LOCAL_CUSTOM_HW_KEY, JSON.stringify(Array.from(map.values())));
  } catch {}
}

// =========================================================================
// CRUD Operations for Classwork
// =========================================================================

export async function fetchAllClasswork(): Promise<ClassworkEntry[]> {
  const deletedIds = await getDeletedPlannerItemIds();
  const deletedSet = new Set(deletedIds);

  // 1. Fetch in parallel from both Central Server (/api/planner-data) and Supabase
  const serverPromise = (async (): Promise<ClassworkEntry[]> => {
    try {
      const res = await withTimeout(fetch('/api/planner-data'), 3500, null as any);
      if (res && res.ok) {
        const srvData = await res.json();
        if (srvData && Array.isArray(srvData.classwork)) {
          return srvData.classwork as ClassworkEntry[];
        }
      }
    } catch {}
    return [];
  })();

  const supabasePromise = (async (): Promise<ClassworkEntry[]> => {
    if (!isSupabaseConfigured) return [];
    try {
      const res = await withTimeout<any>(
        supabase.from('classwork').select('*').order('period', { ascending: true }),
        3500,
        { data: null, error: { message: 'Supabase classwork query timeout' } }
      );
      if (!res.error && res.data && Array.isArray(res.data)) {
        return (res.data as ClassworkRow[]).map(rowToClasswork);
      }
    } catch (err) {
      console.warn('Network exception fetching classwork from Supabase:', err);
    }
    return [];
  })();

  const [serverItems, dbItems] = await Promise.all([serverPromise, supabasePromise]);
  const localCustom = getLocalCustomClasswork();

  // Merge order: INITIAL_CLASSWORK baseline -> Server Items -> Supabase DB Items -> Local Custom Items
  const map = new Map<string, ClassworkEntry>();
  INITIAL_CLASSWORK.forEach((c) => {
    if (c && c.id && !deletedSet.has(c.id)) map.set(c.id, c);
  });
  serverItems.forEach((c) => {
    if (c && c.id && !deletedSet.has(c.id)) map.set(c.id, c);
  });
  dbItems.forEach((c) => {
    if (c && c.id && !deletedSet.has(c.id)) map.set(c.id, c);
  });
  localCustom.forEach((c) => {
    if (c && c.id && !deletedSet.has(c.id)) map.set(c.id, c);
  });

  const consolidated = Array.from(map.values());

  // Background replication:
  // 1. If Supabase is active, push any item from server/local that is not in Supabase yet
  if (isSupabaseConfigured && dbItems.length >= 0) {
    const dbItemIds = new Set(dbItems.map((c) => c.id));
    const missingInDb = consolidated.filter((c) => !dbItemIds.has(c.id));
    if (missingInDb.length > 0) {
      const rows = missingInDb.map(classworkToRow);
      for (let i = 0; i < rows.length; i += 50) {
        Promise.resolve(supabase.from('classwork').upsert(rows.slice(i, i + 50), { onConflict: 'id' })).catch(() => {});
      }
    }
  }

  // 2. If server database is missing any Supabase/local item, update central server
  if (serverItems.length >= 0) {
    const serverItemIds = new Set(serverItems.map((c) => c.id));
    const missingOnServer = consolidated.filter((c) => !serverItemIds.has(c.id));
    if (missingOnServer.length > 0) {
      fetch('/api/planner-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classwork: missingOnServer, mode: 'merge' }),
      }).catch(() => {});
    }
  }

  return consolidated;
}

export async function upsertClasswork(entry: ClassworkEntry): Promise<ClassworkEntry> {
  // If item was previously deleted, un-delete it
  await removeDeletedPlannerItemId(entry.id);
  saveLocalCustomClasswork([entry]);

  // Centralized cross-device sync backup
  try {
    await fetch('/api/planner-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classwork: [entry], mode: 'merge' }),
    });
  } catch (err) {
    console.warn('Central server sync error in upsertClasswork:', err);
  }

  if (!isSupabaseConfigured) {
    return entry;
  }

  try {
    const row = classworkToRow(entry);
    const { data, error } = await supabase
      .from('classwork')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Warning upserting classwork to Supabase:', error.message || error);
      return entry;
    }

    return rowToClasswork(data as ClassworkRow);
  } catch (e) {
    console.warn('Network exception upserting classwork:', e);
    return entry;
  }
}

export async function updateClassworkCompletion(id: string, completed: boolean): Promise<void> {
  const local = getLocalCustomClasswork();
  const target = local.find((c) => c.id === id);
  if (target) {
    target.completed = completed;
    saveLocalCustomClasswork([target]);

    // Centralized cross-device sync backup
    try {
      await fetch('/api/planner-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classwork: [target], mode: 'merge' }),
      });
    } catch (err) {
      console.warn('Central server sync error in updateClassworkCompletion:', err);
    }
  }

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('classwork')
      .update({ completed })
      .eq('id', id);

    if (error) {
      console.warn(`Warning updating classwork ${id} completion:`, error.message || error);
    }
  } catch (e) {
    console.warn(`Network error updating classwork ${id} completion:`, e);
  }
}

const DELETED_ITEMS_STORAGE_KEY = 'nile_deleted_planner_item_ids_v3';

export async function getDeletedPlannerItemIds(): Promise<string[]> {
  let localList: string[] = [];
  try {
    const localRaw = appStorage.getItem(DELETED_ITEMS_STORAGE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (Array.isArray(parsed)) localList = parsed;
    }
  } catch {}

  try {
    const res = await fetch('/api/planner-data');
    if (res.ok) {
      const srvData = await res.json();
      if (Array.isArray(srvData.deletedPlannerItemIds)) {
        localList = Array.from(new Set([...localList, ...srvData.deletedPlannerItemIds]));
      }
    }
  } catch {}

  if (!isSupabaseConfigured) return localList;

  try {
    const { data, error } = await supabase
      .from('planner_settings')
      .select('value')
      .eq('key', 'deleted_planner_item_ids')
      .maybeSingle();
    if (!error && data && data.value) {
      const dbList = JSON.parse(data.value);
      if (Array.isArray(dbList)) {
        const combined = Array.from(new Set([...localList, ...dbList]));
        appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(combined));
        return combined;
      }
    }
  } catch (e) {
    console.warn('Error fetching deleted planner item ids:', e);
  }
  return localList;
}

export async function saveDeletedPlannerItemId(itemId: string): Promise<void> {
  let currentList = await getDeletedPlannerItemIds();
  if (!currentList.includes(itemId)) {
    currentList.push(itemId);
  }
  appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(currentList));

  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('planner_settings')
      .upsert({
        key: 'deleted_planner_item_ids',
        value: JSON.stringify(currentList),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
  } catch (e) {
    console.warn('Error saving deleted planner item id to Supabase settings:', e);
  }
}

export async function removeDeletedPlannerItemId(itemId: string): Promise<void> {
  let currentList = await getDeletedPlannerItemIds();
  if (currentList.includes(itemId)) {
    currentList = currentList.filter(id => id !== itemId);
    appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(currentList));
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('planner_settings')
          .upsert({
            key: 'deleted_planner_item_ids',
            value: JSON.stringify(currentList),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
      } catch (e) {
        console.warn('Error removing deleted planner item id from Supabase settings:', e);
      }
    }
  }
}

export async function deleteClasswork(id: string): Promise<void> {
  await saveDeletedPlannerItemId(id);

  // Remove from local custom classwork storage immediately
  try {
    const current = getLocalCustomClasswork();
    const updated = current.filter((c) => c.id !== id);
    appStorage.setItem(LOCAL_CUSTOM_CW_KEY, JSON.stringify(updated));
  } catch {}

  // Centralized cross-device sync backup
  try {
    await fetch('/api/planner-data/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'classwork' }),
    });
  } catch (err) {
    console.warn('Central server delete error in deleteClasswork:', err);
  }

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase.from('classwork').delete().eq('id', id);
    if (error) {
      console.warn(`Warning deleting classwork ${id}:`, error.message || error);
    }
  } catch (e) {
    console.warn(`Network error deleting classwork ${id}:`, e);
  }
}

export async function bulkInsertClasswork(entries: ClassworkEntry[], mode: 'merge' | 'replace' = 'merge'): Promise<void> {
  if (entries.length === 0) return;
  saveLocalCustomClasswork(entries, mode);

  // Centralized cross-device sync backup
  try {
    await fetch('/api/planner-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classwork: entries, mode }),
    });
  } catch (err) {
    console.warn('Central server sync error in bulkInsertClasswork:', err);
  }

  if (!isSupabaseConfigured) return;

  const rows = entries.map(classworkToRow);
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    try {
      const { error } = await supabase.from('classwork').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.warn('Warning bulk inserting classwork chunk:', error.message || error);
      }
    } catch (e) {
      console.warn('Network exception bulk inserting classwork chunk:', e);
    }
  }
}

// =========================================================================
// CRUD Operations for Homework
// =========================================================================

export async function fetchAllHomework(): Promise<HomeworkEntry[]> {
  const deletedIds = await getDeletedPlannerItemIds();
  const deletedSet = new Set(deletedIds);

  // 1. Fetch in parallel from both Central Server (/api/planner-data) and Supabase
  const serverPromise = (async (): Promise<HomeworkEntry[]> => {
    try {
      const res = await withTimeout(fetch('/api/planner-data'), 3500, null as any);
      if (res && res.ok) {
        const srvData = await res.json();
        if (srvData && Array.isArray(srvData.homework)) {
          return srvData.homework as HomeworkEntry[];
        }
      }
    } catch {}
    return [];
  })();

  const supabasePromise = (async (): Promise<HomeworkEntry[]> => {
    if (!isSupabaseConfigured) return [];
    try {
      const res = await withTimeout<any>(
        supabase.from('homework').select('*').order('created_at', { ascending: false }),
        3500,
        { data: null, error: { message: 'Supabase homework query timeout' } }
      );
      if (!res.error && res.data && Array.isArray(res.data)) {
        return (res.data as HomeworkRow[]).map(rowToHomework);
      }
    } catch (err) {
      console.warn('Network exception fetching homework from Supabase:', err);
    }
    return [];
  })();

  const [serverItems, dbItems] = await Promise.all([serverPromise, supabasePromise]);
  const localCustom = getLocalCustomHomework();

  // Merge order: INITIAL_HOMEWORK baseline -> Server Items -> Supabase DB Items -> Local Custom Items
  const map = new Map<string, HomeworkEntry>();
  INITIAL_HOMEWORK.forEach((h) => {
    if (h && h.id && !deletedSet.has(h.id)) map.set(h.id, h);
  });
  serverItems.forEach((h) => {
    if (h && h.id && !deletedSet.has(h.id)) map.set(h.id, h);
  });
  dbItems.forEach((h) => {
    if (h && h.id && !deletedSet.has(h.id)) map.set(h.id, h);
  });
  localCustom.forEach((h) => {
    if (h && h.id && !deletedSet.has(h.id)) map.set(h.id, h);
  });

  const consolidated = Array.from(map.values()).map((item) => {
    const isTargetArabicHw =
      item.id === 'hw-w2-ar-tue-kg1a-wb' ||
      item.id === 'hw-w2-ar-tue-kg1b-wb' ||
      item.id === 'hw-w2-ar-tue-kg1c-wb' ||
      (item.subject === 'Arabic' && item.assignedDay === 'Tuesday' && item.week === 2);

    const has46 =
      Boolean(item.task && typeof item.task === 'string' && item.task.includes('46')) ||
      Boolean(item.pages && typeof item.pages === 'string' && item.pages.includes('46')) ||
      Boolean(item.details && typeof item.details === 'string' && item.details.includes('46'));

    if (isTargetArabicHw && has46) {
      const corrected: HomeworkEntry = {
        ...item,
        task: item.task ? item.task.replace(/46/g, '47') : item.task,
        pages: item.pages ? item.pages.replace(/46/g, '47') : '47',
        details: item.details ? item.details.replace(/46/g, '47') : item.details,
      };
      return corrected;
    }

    return item;
  });

  // Background replication:
  // 1. If Supabase is active, push missing items to Supabase
  if (isSupabaseConfigured && dbItems.length >= 0) {
    const dbItemIds = new Set(dbItems.map((h) => h.id));
    const missingInDb = consolidated.filter((h) => !dbItemIds.has(h.id));
    if (missingInDb.length > 0) {
      const rows = missingInDb.map(homeworkToRow);
      for (let i = 0; i < rows.length; i += 50) {
        Promise.resolve(supabase.from('homework').upsert(rows.slice(i, i + 50), { onConflict: 'id' })).catch(() => {});
      }
    }
  }

  // 2. If server is missing any Supabase/local items, update central server
  if (serverItems.length >= 0) {
    const serverItemIds = new Set(serverItems.map((h) => h.id));
    const missingOnServer = consolidated.filter((h) => !serverItemIds.has(h.id));
    if (missingOnServer.length > 0) {
      fetch('/api/planner-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homework: missingOnServer, mode: 'merge' }),
      }).catch(() => {});
    }
  }

  return consolidated;
}

export async function upsertHomework(entry: HomeworkEntry): Promise<HomeworkEntry> {
  // If item was previously deleted, un-delete it
  await removeDeletedPlannerItemId(entry.id);
  saveLocalCustomHomework([entry]);

  // Centralized cross-device sync backup
  try {
    await fetch('/api/planner-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homework: [entry], mode: 'merge' }),
    });
  } catch (err) {
    console.warn('Central server sync error in upsertHomework:', err);
  }

  if (!isSupabaseConfigured) {
    return entry;
  }

  try {
    const row = homeworkToRow(entry);
    const { data, error } = await supabase
      .from('homework')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Warning upserting homework to Supabase:', error.message || error);
      return entry;
    }

    return rowToHomework(data as HomeworkRow);
  } catch (e) {
    console.warn('Network exception upserting homework:', e);
    return entry;
  }
}

export async function updateHomeworkCompletion(id: string, completed: boolean): Promise<void> {
  const local = getLocalCustomHomework();
  const target = local.find((h) => h.id === id);
  if (target) {
    target.completed = completed;
    saveLocalCustomHomework([target]);

    // Centralized cross-device sync backup
    try {
      await fetch('/api/planner-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homework: [target], mode: 'merge' }),
      });
    } catch (err) {
      console.warn('Central server sync error in updateHomeworkCompletion:', err);
    }
  }

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('homework')
      .update({ completed })
      .eq('id', id);

    if (error) {
      console.warn(`Warning updating homework ${id} completion:`, error.message || error);
    }
  } catch (e) {
    console.warn(`Network error updating homework ${id} completion:`, e);
  }
}

export async function deleteHomework(id: string): Promise<void> {
  await saveDeletedPlannerItemId(id);

  // Remove from local custom homework storage immediately
  try {
    const current = getLocalCustomHomework();
    const updated = current.filter((h) => h.id !== id);
    appStorage.setItem(LOCAL_CUSTOM_HW_KEY, JSON.stringify(updated));
  } catch {}

  // Centralized cross-device sync backup
  try {
    await fetch('/api/planner-data/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'homework' }),
    });
  } catch (err) {
    console.warn('Central server delete error in deleteHomework:', err);
  }

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (error) {
      console.warn(`Warning deleting homework ${id}:`, error.message || error);
    }
  } catch (e) {
    console.warn(`Network error deleting homework ${id}:`, e);
  }
}

export async function bulkInsertHomework(entries: HomeworkEntry[], mode: 'merge' | 'replace' = 'merge'): Promise<void> {
  if (entries.length === 0) return;
  saveLocalCustomHomework(entries, mode);

  // Centralized cross-device sync backup
  try {
    await fetch('/api/planner-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homework: entries, mode }),
    });
  } catch (err) {
    console.warn('Central server sync error in bulkInsertHomework:', err);
  }

  if (!isSupabaseConfigured) return;

  const rows = entries.map(homeworkToRow);
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    try {
      const { error } = await supabase.from('homework').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.warn('Warning bulk inserting homework chunk:', error.message || error);
      }
    } catch (e) {
      console.warn('Network error bulk inserting homework chunk:', e);
    }
  }
}

// =========================================================================
// Planner App Settings (Class, Week, Day, Profile)
// =========================================================================

export async function fetchPlannerSettings(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {};

  try {
    const res = await withTimeout<any>(
      supabase.from('planner_settings').select('*'),
      2500,
      { data: null, error: { message: 'Settings query timeout' } }
    );
    const { data, error } = res;
    if (error || !data) {
      return {};
    }

    const map: Record<string, string> = {};
    for (const item of data || []) {
      map[item.key] = item.value;
    }
    return map;
  } catch {
    return {};
  }
}

export async function savePlannerSetting(key: string, value: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('planner_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    console.warn(`Could not save planner setting ${key} to Supabase:`, error.message);
  }
}

// =========================================================================
// Student Progress (Saved per Student)
// =========================================================================

export async function fetchStudentProgressFromDb(studentName: string): Promise<{
  studentName: string;
  classId?: ClassId;
  completedClassworkIds: string[];
  completedHomeworkIds: string[];
  lastActive: number;
} | null> {
  if (!isSupabaseConfigured) return null;

  const clean = studentName.trim().toLowerCase();
  const { data, error } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_name', clean)
    .maybeSingle();

  if (error || !data) return null;

  return {
    studentName: data.student_name,
    classId: (data.class_id as ClassId) || undefined,
    completedClassworkIds: Array.isArray(data.completed_classwork_ids) ? data.completed_classwork_ids : [],
    completedHomeworkIds: Array.isArray(data.completed_homework_ids) ? data.completed_homework_ids : [],
    lastActive: data.last_active || Date.now(),
  };
}

export async function saveStudentProgressToDb(
  studentName: string,
  completedClassworkIds: string[],
  completedHomeworkIds: string[],
  classId?: ClassId
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const clean = studentName.trim().toLowerCase();
  const { error } = await supabase.from('student_progress').upsert(
    {
      student_name: clean,
      class_id: classId || null,
      completed_classwork_ids: completedClassworkIds,
      completed_homework_ids: completedHomeworkIds,
      last_active: Date.now(),
    },
    { onConflict: 'student_name' }
  );

  if (error) {
    console.warn(`Could not save progress for ${studentName} to Supabase:`, error.message);
  }
}

export async function fetchKnownStudentsFromDb(): Promise<{ name: string; classId?: ClassId; lastActive: number }[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('student_progress')
    .select('student_name, class_id, last_active')
    .order('last_active', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((d) => ({
    name: d.student_name,
    classId: (d.class_id as ClassId) || undefined,
    lastActive: d.last_active || Date.now(),
  }));
}

// =========================================================================
// Automated Initial Seeding
// =========================================================================

export async function seedInitialDataIfEmpty(): Promise<{
  seeded: boolean;
  classworkCount: number;
  homeworkCount: number;
}> {
  if (!isSupabaseConfigured) {
    return { seeded: false, classworkCount: 0, homeworkCount: 0 };
  }

  try {
    // Check existing count in classwork
    const { count: cwCount, error: cwErr } = await supabase
      .from('classwork')
      .select('*', { count: 'exact', head: true });

    if (cwErr) {
      console.warn('Error checking classwork table count:', cwErr.message);
      return { seeded: false, classworkCount: 0, homeworkCount: 0 };
    }

    // Check existing count in homework
    const { count: hwCount, error: hwErr } = await supabase
      .from('homework')
      .select('*', { count: 'exact', head: true });

    if (hwErr) {
      console.warn('Error checking homework table count:', hwErr.message);
      return { seeded: false, classworkCount: cwCount || 0, homeworkCount: 0 };
    }

    let seeded = false;

    // Seed classwork if empty
    if ((cwCount ?? 0) === 0) {
      const cwInitial = INITIAL_CLASSWORK;
      if (cwInitial && cwInitial.length > 0) {
        console.log(`🌱 Seeding ${cwInitial.length} classwork entries into Supabase...`);
        const rows = cwInitial.map(classworkToRow);
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          try {
            const { error: seedCwErr } = await supabase.from('classwork').upsert(chunk, { onConflict: 'id' });
            if (seedCwErr) {
              console.warn('Notice seeding classwork chunk:', seedCwErr.message || seedCwErr);
            } else {
              seeded = true;
            }
          } catch (e) {
            console.warn('Network exception during classwork seed chunk:', e);
          }
        }
      }
    }

    // Seed homework if empty
    if ((hwCount ?? 0) === 0) {
      const hwInitial = INITIAL_HOMEWORK;
      if (hwInitial && hwInitial.length > 0) {
        console.log(`🌱 Seeding ${hwInitial.length} homework entries into Supabase...`);
        const rows = hwInitial.map(homeworkToRow);
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          try {
            const { error: seedHwErr } = await supabase.from('homework').upsert(chunk, { onConflict: 'id' });
            if (seedHwErr) {
              console.warn('Notice seeding homework chunk:', seedHwErr.message || seedHwErr);
            } else {
              seeded = true;
            }
          } catch (e) {
            console.warn('Network exception during homework seed chunk:', e);
          }
        }
      }
    }

    // Seed initial settings if empty
    try {
      const { count: settiingsCount } = await supabase
        .from('planner_settings')
        .select('*', { count: 'exact', head: true });

      if ((settiingsCount ?? 0) === 0) {
        const settingsToSeed = [
          { key: 'current_class', value: initialData.nile_planner_current_class_v3 || 'KG1B' },
          { key: 'current_week', value: initialData.nile_planner_current_week_v3 || '3' },
          { key: 'selected_day', value: initialData.nile_planner_selected_day_v3 || 'Sunday' },
          { key: 'current_block', value: '1' },
        ];
        await supabase.from('planner_settings').upsert(settingsToSeed, { onConflict: 'key' });
      }
    } catch {
      // Ignore if table not yet created
    }

    return {
      seeded,
      classworkCount: cwCount ?? 0,
      homeworkCount: hwCount ?? 0,
    };
  } catch (err) {
    console.warn('Notice during auto-seeding:', err);
    return { seeded: false, classworkCount: 0, homeworkCount: 0 };
  }
}

export async function forceSyncBaselineToSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const deletedIds = await getDeletedPlannerItemIds();
    const deletedSet = new Set(deletedIds);

    // 1. Check existing classwork
    const { data: cwExisting } = await supabase
      .from('classwork')
      .select('id');
    
    const existingCwIds = new Set((cwExisting || []).map((r: any) => r.id));
    
    // Only insert baseline items if the database has no classwork at all, or only insert items not in deletedSet and not already existing
    if (existingCwIds.size === 0) {
      const missingCw = INITIAL_CLASSWORK.filter((c) => c && c.id && !deletedSet.has(c.id));
      if (missingCw.length > 0) {
        const cwRows = missingCw.map(classworkToRow);
        for (let i = 0; i < cwRows.length; i += 50) {
          const chunk = cwRows.slice(i, i + 50);
          await supabase.from('classwork').insert(chunk);
        }
      }
    }

    // 2. Check existing homework
    const { data: hwExisting } = await supabase
      .from('homework')
      .select('id');
    
    const existingHwIds = new Set((hwExisting || []).map((r: any) => r.id));
    
    if (existingHwIds.size === 0) {
      const missingHw = INITIAL_HOMEWORK.filter((h) => h && h.id && !deletedSet.has(h.id));
      if (missingHw.length > 0) {
        const hwRows = missingHw.map(homeworkToRow);
        for (let i = 0; i < hwRows.length; i += 50) {
          const chunk = hwRows.slice(i, i + 50);
          await supabase.from('homework').insert(chunk);
        }
      }
    }
  } catch (err) {
    console.warn('[Sync] Non-fatal sync notice:', err);
  }
}

// =============================================================================
// Materials & PDF Cloud Storage Functions (Supabase Storage + Database)
// =============================================================================

export interface MaterialRow {
  id: string;
  file_name: string;
  file_size: number;
  block: number;
  section: string;
  class_id: string | null;
  storage_url: string | null;
  file_data: string | null;
  uploaded_at: string;
}

export function materialToRow(item: MaterialItem): MaterialRow {
  const effectiveUrl = item.type === 'link' ? (item.linkUrl || item.storageUrl || null) : (item.storageUrl || null);
  const sizeNum = typeof item.fileSize === 'number' ? item.fileSize : Number(item.fileSize) || 0;
  const blockNum = typeof item.block === 'number' ? item.block : Number(item.block) || 1;
  return {
    id: item.id,
    file_name: item.fileName,
    file_size: sizeNum,
    block: blockNum,
    section: item.section || 'Main sheet',
    class_id: item.classId || 'ALL',
    storage_url: effectiveUrl,
    // Only save file_data if small (< 1.5MB) to prevent large DB payloads
    file_data: sizeNum < 1500000 ? (item.fileData || null) : null,
    uploaded_at: item.uploadedAt || new Date().toISOString(),
  };
}

export function rowToMaterial(row: MaterialRow): MaterialItem {
  const isWebUrl = Boolean(
    row.storage_url &&
    (row.storage_url.startsWith('http://') || row.storage_url.startsWith('https://')) &&
    !row.storage_url.toLowerCase().endsWith('.pdf') &&
    !row.storage_url.includes('.pdf?')
  );
  const isLink = isWebUrl || row.file_size === 0;

  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    block: row.block,
    section: row.section,
    classId: (row.class_id as ClassId | 'ALL') || 'ALL',
    storageUrl: row.storage_url || undefined,
    linkUrl: isLink ? (row.storage_url || undefined) : undefined,
    type: isLink ? 'link' : 'pdf',
    fileData: row.file_data || undefined,
    uploadedAt: row.uploaded_at,
  };
}

/**
 * Upload a PDF file directly to Supabase Storage ('materials' bucket)
 * Returns the public URL if successful.
 */
export async function uploadPdfToSupabaseStorage(
  file: File | Blob,
  fileName: string
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const bucketName = 'materials';
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.warn('Storage upload notice (falling back to database or local):', uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    return publicUrlData.publicUrl || null;
  } catch (e) {
    console.warn('Network exception during Supabase Storage upload:', e);
    return null;
  }
}

/**
 * Fetch all materials metadata from Supabase 'materials' table
 */
export async function fetchAllMaterialsFromSupabase(): Promise<MaterialItem[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch materials notice:', error.message);
      return [];
    }

    return (data as MaterialRow[]).map(rowToMaterial);
  } catch (err) {
    console.warn('Network exception fetching materials:', err);
    return [];
  }
}

/**
 * Upsert material metadata record to Supabase
 */
export async function saveMaterialToSupabase(item: MaterialItem): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const row = materialToRow(item);
    const { error } = await supabase
      .from('materials')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase save material notice:', error.message);
    }
  } catch (err) {
    console.warn('Network exception saving material:', err);
  }
}

/**
 * Delete material from Supabase table and Storage if present
 */
export async function deleteMaterialFromSupabase(id: string, storageUrl?: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    // 1. Delete from database
    await supabase.from('materials').delete().eq('id', id);

    // 2. If storageUrl points to materials, attempt file deletion
    if (storageUrl && (storageUrl.includes('school_materials') || storageUrl.includes('materials'))) {
      const parts = storageUrl.split(storageUrl.includes('school_materials') ? '/school_materials/' : '/materials/');
      if (parts[1]) {
        await supabase.storage.from('materials').remove([parts[1]]);
      }
    }
  } catch (err) {
    console.warn('Network exception deleting material from Supabase:', err);
  }
}

