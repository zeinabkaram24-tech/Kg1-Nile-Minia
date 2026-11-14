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

export const DEFAULT_SUPABASE_URL = 'https://elcczvazlgxbgnioxfaf.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_5DUTdClGKYJ_PI4GYRf07g_RFkxguqA';
const STALE_GRADE2_SUPABASE_HOST = 'umryrjwmlkdbjmgmnbkt.supabase.co';

export function getActiveSupabaseConfig(): { url: string; key: string } {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem(STORAGE_KEYS_SUPABASE.URL);
    const savedKey = localStorage.getItem(STORAGE_KEYS_SUPABASE.KEY);
    if (savedUrl && savedKey && savedUrl.trim() !== '' && savedKey.trim() !== '') {
      const cleaned = cleanSupabaseUrl(savedUrl);
      // Migrate stale Grade 2 Supabase URL cached in browser localStorage to active KG1 project
      if (!cleaned.includes(STALE_GRADE2_SUPABASE_HOST)) {
        return {
          url: cleaned,
          key: cleanSupabaseKey(savedKey),
        };
      }
      try {
        localStorage.removeItem(STORAGE_KEYS_SUPABASE.URL);
        localStorage.removeItem(STORAGE_KEYS_SUPABASE.KEY);
      } catch {}
    }
  }
  // Fall back to environment variable or central default if not saved locally
  const url =
    (typeof import.meta !== 'undefined' && import.meta?.env
      ? (import.meta.env.VITE_SUPABASE_URL as string)
      : '') || DEFAULT_SUPABASE_URL;
  const key =
    (typeof import.meta !== 'undefined' && import.meta?.env
      ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
      : '') || DEFAULT_SUPABASE_ANON_KEY;
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

// Paginated reader to avoid PostgREST's silent 1000-row cap
export async function fetchAllRowsPaginated<T = any>(
  table: string,
  selectCols = '*',
  orderCol?: string,
  ascending = true,
  timeoutMs = 10000
): Promise<{ data: T[] | null; error: any }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }
  const pageSize = 1000;
  const maxPages = 25;
  const allRows: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query: any = supabase.from(table).select(selectCols);
    if (orderCol) {
      query = query.order(orderCol, { ascending });
    }
    query = query.range(from, to);

    const res = await withTimeout<any>(
      query,
      timeoutMs,
      { data: null, error: { message: `Supabase ${table} query timeout (page ${page})` } }
    );

    if (res?.error) {
      if (page === 0) {
        return { data: null, error: res.error };
      }
      console.warn(`[Supabase Pagination] Error on ${table} page ${page}:`, res.error.message || res.error);
      break;
    }

    const batch: T[] = Array.isArray(res?.data) ? res.data : [];
    allRows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
  }

  return { data: allRows, error: null };
}

// Shared short-lived cache + in-flight deduplication for the ~1MB /api/planner-data payload
export interface ServerPlannerPayload {
  classwork: ClassworkEntry[];
  homework: HomeworkEntry[];
  tomorrowNotes: any[];
  deletedTomorrowNoteIds?: string[];
  deletedPlannerItemIds?: string[];
}

let serverPlannerCache: { data: ServerPlannerPayload; timestamp: number } | null = null;
let serverPlannerInFlight: Promise<ServerPlannerPayload | null> | null = null;

export function invalidateServerPlannerDataCache(): void {
  serverPlannerCache = null;
}

export async function fetchServerPlannerDataShared(force = false): Promise<ServerPlannerPayload | null> {
  const now = Date.now();
  if (!force && serverPlannerCache && now - serverPlannerCache.timestamp < 2000) {
    return serverPlannerCache.data;
  }
  if (!force && serverPlannerInFlight) {
    return serverPlannerInFlight;
  }

  const run = (async (): Promise<ServerPlannerPayload | null> => {
    try {
      const res = await withTimeout(
        fetch('/api/planner-data', { cache: 'no-store' }),
        8000,
        null as any
      );
      if (res && res.ok) {
        const data = (await res.json()) as ServerPlannerPayload;
        if (data && typeof data === 'object') {
          serverPlannerCache = { data, timestamp: Date.now() };
          return data;
        }
      }
    } catch {}
    return serverPlannerCache?.data || null;
  })();

  serverPlannerInFlight = run;
  try {
    return await run;
  } finally {
    if (serverPlannerInFlight === run) {
      serverPlannerInFlight = null;
    }
  }
}

async function upsertRowsInChunks(
  table: string,
  rows: Record<string, any>[],
  chunkSize = 50
): Promise<void> {
  if (!isSupabaseConfigured || rows.length === 0) return;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    try {
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.warn(`[Supabase] Chunk upsert warning on ${table}:`, error.message || error);
        // Fallback: upsert individually so one problematic row does not block the whole chunk
        for (const row of chunk) {
          try {
            const { error: singleErr } = await supabase.from(table).upsert(row, { onConflict: 'id' });
            if (singleErr) {
              console.warn(`[Supabase] Row upsert warning on ${table} (${row.id}):`, singleErr.message || singleErr);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn(`[Supabase] Network exception upserting ${table} chunk:`, e);
    }
  }
}

export async function syncSupabaseConfigWithServer(): Promise<boolean> {
  try {
    const localUrl = localStorage.getItem(STORAGE_KEYS_SUPABASE.URL) || '';
    const localKey = localStorage.getItem(STORAGE_KEYS_SUPABASE.KEY) || '';
    
    // Check server-side Supabase credentials with timeout
    const res = await withTimeout(fetch('/api/supabase-config', { cache: 'no-store' }), 3500, null as any);
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

// Database Row Types (snake_case in Supabase, matching live KG1 schema)
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
  links?: { title: string; url: string }[] | null;
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
  link_url: string | null;
  link_title?: string | null;
  links?: { title: string; url: string }[] | null;
  created_at?: string;
}

export interface StudentProgressRow {
  student_name: string;
  class_id: string | null;
  completed_classwork_ids: string[];
  completed_homework_ids: string[];
  last_active: number;
}

export function unpackDetailsWithMeta(detailsStr?: string | null): {
  details: string | undefined;
  pdfUrl: string | undefined;
  links: { title: string; url: string }[] | undefined;
  linkTitle: string | undefined;
} {
  if (!detailsStr) {
    return { details: undefined, pdfUrl: undefined, links: undefined, linkTitle: undefined };
  }
  let text = String(detailsStr);
  let pdfUrl: string | undefined;
  let links: { title: string; url: string }[] | undefined;
  let linkTitle: string | undefined;

  const linksMatch = text.match(/\|\|LINKS_JSON:(\[[\s\S]*?\])(?=\|\||$)/);
  if (linksMatch) {
    try {
      const parsed = JSON.parse(linksMatch[1]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        links = parsed;
      }
    } catch {}
    text = text.replace(linksMatch[0], '');
  }

  const linkTitleMatch = text.match(/\|\|LINK_TITLE:([\s\S]*?)(?=\|\||$)/);
  if (linkTitleMatch) {
    linkTitle = linkTitleMatch[1]?.trim() || undefined;
    text = text.replace(linkTitleMatch[0], '');
  }

  const pdfMatch = text.match(/\|\|PDF_URL:([\s\S]*?)(?=\|\||$)/);
  if (pdfMatch) {
    pdfUrl = pdfMatch[1]?.trim() || undefined;
    text = text.replace(pdfMatch[0], '');
  }

  return {
    details: text.trim() || undefined,
    pdfUrl,
    links,
    linkTitle,
  };
}

export function packDetailsWithMeta(
  details?: string,
  meta?: { pdfUrl?: string; links?: { title: string; url: string }[]; linkTitle?: string }
): string | undefined {
  // Strip any previously packed markers first so packing is idempotent
  const cleanBase = unpackDetailsWithMeta(details).details || '';
  let res = cleanBase;
  if (meta?.pdfUrl && meta.pdfUrl.trim()) {
    res += ` ||PDF_URL:${meta.pdfUrl.trim()}`;
  }
  if (meta?.linkTitle && meta.linkTitle.trim()) {
    res += ` ||LINK_TITLE:${meta.linkTitle.trim()}`;
  }
  if (meta?.links && Array.isArray(meta.links) && meta.links.length > 0) {
    res += ` ||LINKS_JSON:${JSON.stringify(meta.links)}`;
  }
  return res.trim() || undefined;
}

export function unpackClassworkDetails(detailsStr?: string | null) {
  return unpackDetailsWithMeta(detailsStr);
}

export function packClassworkDetails(
  details?: string,
  pdfUrl?: string,
  links?: { title: string; url: string }[]
) {
  return packDetailsWithMeta(details, { pdfUrl, links });
}

// Helper to pack and unpack homework details to support storing pdfUrl, linkTitle, and links without DB schema change
export function unpackHomeworkDetails(detailsStr?: string | null) {
  return unpackDetailsWithMeta(detailsStr);
}

export function packHomeworkDetails(
  details?: string,
  pdfUrl?: string,
  links?: { title: string; url: string }[],
  linkTitle?: string
) {
  return packDetailsWithMeta(details, { pdfUrl, links, linkTitle });
}

// Convert from Row to ClassworkEntry
export function rowToClasswork(row: ClassworkRow): ClassworkEntry {
  const unpacked = unpackClassworkDetails(row.details);
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
  if ((!links || (Array.isArray(links) && links.length === 0)) && unpacked.links && unpacked.links.length > 0) {
    links = unpacked.links;
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
    details: unpacked.details,
    pages: row.pages || undefined,
    completed: Boolean(row.completed),
    block: row.block || 1,
    week: row.week || 1,
    linkUrl: row.link_url || baseline?.linkUrl || undefined,
    linkTitle: row.link_title || baseline?.linkTitle || undefined,
    links: links && Array.isArray(links) && links.length > 0 ? links : undefined,
    pdfUrl: (row as any).pdf_url || unpacked.pdfUrl || baseline?.pdfUrl || undefined,
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
    details: packClassworkDetails(entry.details, entry.pdfUrl, entry.links) || null,
    pages: entry.pages || null,
    completed: Boolean(entry.completed),
    block: entry.block || 1,
    week: entry.week || 1,
    link_url: entry.linkUrl || null,
    link_title: entry.linkTitle || null,
    links: Array.isArray(entry.links) ? entry.links : [],
  };
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
  if ((!links || (Array.isArray(links) && links.length === 0)) && unpacked.links && unpacked.links.length > 0) {
    links = unpacked.links;
  }
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
    isLinkTask: Boolean((row as any).is_link_task ?? (row.link_url || (Array.isArray(links) && links.length > 0))),
    linkUrl: row.link_url || baseline?.linkUrl || undefined,
    linkTitle: row.link_title || unpacked.linkTitle || baseline?.linkTitle || undefined,
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
    details: packHomeworkDetails(entry.details, entry.pdfUrl, entry.links, entry.linkTitle) || null,
    pages: entry.pages || null,
    completed: Boolean(entry.completed),
    priority: entry.priority || 'normal',
    block: entry.block || 1,
    week: entry.week || 1,
    link_url: entry.linkUrl || null,
    link_title: entry.linkTitle || null,
    links: Array.isArray(entry.links) ? entry.links : [],
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

try {
  if (typeof window !== 'undefined') {
    window.localStorage?.removeItem('homework_planner_custom_entries_v3');
    window.localStorage?.removeItem('classwork_planner_custom_entries_v3');
  }
} catch {}

const LOCAL_CUSTOM_HW_KEY = 'homework_planner_custom_entries_v4';
const LOCAL_CUSTOM_CW_KEY = 'classwork_planner_custom_entries_v4';

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

export async function fetchAllClasswork(preloadedDeletedIds?: string[]): Promise<ClassworkEntry[]> {
  const deletedIds = preloadedDeletedIds ?? (await getDeletedPlannerItemIds());
  const deletedSet = new Set(deletedIds);

  // 1. Fetch in parallel from both Central Server (/api/planner-data, deduplicated) and paginated Supabase
  const serverPromise = (async (): Promise<{ items: ClassworkEntry[]; ok: boolean }> => {
    const srvData = await fetchServerPlannerDataShared();
    if (srvData && Array.isArray(srvData.classwork)) {
      return { items: srvData.classwork as ClassworkEntry[], ok: true };
    }
    return { items: [], ok: false };
  })();

  const supabasePromise = (async (): Promise<{ items: ClassworkEntry[]; ok: boolean }> => {
    if (!isSupabaseConfigured) return { items: [], ok: false };
    try {
      const res = await fetchAllRowsPaginated<ClassworkRow>('classwork', '*', 'period', true, 10000);
      if (!res.error && Array.isArray(res.data)) {
        return { items: res.data.map(rowToClasswork), ok: true };
      }
      if (res.error) {
        console.warn('Error fetching classwork from Supabase:', res.error.message || res.error);
      }
    } catch (err) {
      console.warn('Network exception fetching classwork from Supabase:', err);
    }
    return { items: [], ok: false };
  })();

  const [serverRes, supabaseRes] = await Promise.all([serverPromise, supabasePromise]);
  const serverItems = serverRes.items;
  const dbItems = supabaseRes.items;
  const localCustom = getLocalCustomClasswork().filter((c) => c && c.id && !deletedSet.has(c.id));

  // Merge order: INITIAL_CLASSWORK baseline -> Local Custom Items -> Server Items -> Supabase DB Items
  // Preserve multi-links / pdfUrl / linkTitle from richer sources when Supabase row lacks them
  const map = new Map<string, ClassworkEntry>();
  const mergeIntoMap = (incoming: ClassworkEntry) => {
    if (!incoming || !incoming.id || deletedSet.has(incoming.id)) return;
    const prev = map.get(incoming.id);
    if (!prev) {
      map.set(incoming.id, incoming);
      return;
    }
    map.set(incoming.id, {
      ...prev,
      ...incoming,
      links: incoming.links && incoming.links.length > 0 ? incoming.links : prev.links,
      linkTitle: incoming.linkTitle || prev.linkTitle,
      linkUrl: incoming.linkUrl || prev.linkUrl,
      pdfUrl: incoming.pdfUrl || prev.pdfUrl,
    });
  };

  INITIAL_CLASSWORK.forEach(mergeIntoMap);
  localCustom.forEach(mergeIntoMap);
  serverItems.forEach(mergeIntoMap);
  dbItems.forEach(mergeIntoMap);

  const repairedForDb: ClassworkEntry[] = [];
  const dbItemMap = new Map(dbItems.map((c) => [c.id, c]));

  const consolidated = Array.from(map.values()).map((c) => {
    const isProtectedBaseline =
      ((c.block || 1) === 2 && ((c.week || 1) === 2 || (c.week || 1) === 3)) ||
      ((c.block || 1) === 3 && (c.week || 1) === 2);
    if (isProtectedBaseline) {
      const baseline = INITIAL_CLASSWORK.find((b) => b.id === c.id);
      if (baseline) {
        const updated: ClassworkEntry = {
          ...c,
          title: baseline.title,
          details: baseline.details,
          pages: baseline.pages,
          links: baseline.links,
          linkUrl: baseline.linkUrl,
          linkTitle: baseline.linkTitle,
        };
        const dbMatch = dbItemMap.get(c.id);
        if (
          dbMatch &&
          (dbMatch.title !== updated.title ||
            (dbMatch.details || '') !== (updated.details || '') ||
            (dbMatch.pages || '') !== (updated.pages || '') ||
            (dbMatch.linkUrl || '') !== (updated.linkUrl || '') ||
            (dbMatch.linkTitle || '') !== (updated.linkTitle || '') ||
            JSON.stringify(dbMatch.links || []) !== JSON.stringify(updated.links || []))
        ) {
          repairedForDb.push(updated);
        }
        return updated;
      }
    }
    return c;
  });

  // Clean deleted items from local custom cache
  if (deletedSet.size > 0) {
    saveLocalCustomClasswork(localCustom, 'replace');
  }

  // Background replication:
  // 1. If Supabase succeeded, push missing items AND protected-baseline repairs to Supabase
  if (isSupabaseConfigured && supabaseRes.ok) {
    const missingInDb = consolidated.filter((c) => !dbItemMap.has(c.id));
    const toPushMap = new Map<string, ClassworkEntry>();
    missingInDb.forEach((c) => toPushMap.set(c.id, c));
    repairedForDb.forEach((c) => toPushMap.set(c.id, c));
    if (toPushMap.size > 0) {
      const rows = Array.from(toPushMap.values()).map(classworkToRow);
      upsertRowsInChunks('classwork', rows, 50).catch(() => {});
    }
  }

  // 2. If server database is missing any Supabase/local item, update central server (without cloud re-mirror loop)
  if (serverRes.ok) {
    const serverItemIds = new Set(serverItems.map((c) => c.id));
    const missingOnServer = consolidated.filter((c) => !serverItemIds.has(c.id));
    if (missingOnServer.length > 0) {
      invalidateServerPlannerDataCache();
      fetch('/api/planner-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-skip-cloud-mirror': '1' },
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
  invalidateServerPlannerDataCache();

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
    invalidateServerPlannerDataCache();

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

export async function readGlobalPlannerSettingsRow(): Promise<{
  id: string;
  current_block?: number;
  current_week?: number;
  active_term?: string;
  settings: Record<string, any>;
} | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await withTimeout<any>(
      supabase.from('planner_settings').select('id, current_block, current_week, active_term, settings').eq('id', 'global').maybeSingle(),
      5000,
      { data: null, error: null }
    );
    if (!res?.error && res?.data) {
      const settingsObj = res.data.settings && typeof res.data.settings === 'object' ? res.data.settings : {};
      return {
        ...res.data,
        settings: settingsObj,
      };
    }
  } catch {}
  return null;
}

export async function patchGlobalPlannerSettings(
  settingsPatch: Record<string, any>,
  topLevel?: { current_block?: number; current_week?: number; active_term?: string }
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const existing = await readGlobalPlannerSettingsRow();
    const mergedSettings = {
      ...(existing?.settings || {}),
      ...settingsPatch,
    };
    const row: Record<string, any> = {
      id: 'global',
      current_block: topLevel?.current_block ?? existing?.current_block ?? 1,
      current_week: topLevel?.current_week ?? existing?.current_week ?? 2,
      active_term: topLevel?.active_term ?? existing?.active_term ?? 'Term 2',
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('planner_settings').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Warning updating global planner_settings:', error.message || error);
    }
  } catch (e) {
    console.warn('Network error updating global planner_settings:', e);
  }
}

const DELETED_ITEMS_STORAGE_KEY = 'nile_deleted_planner_item_ids_v3';
let deletedPlannerIdsInFlight: Promise<string[]> | null = null;

export async function getDeletedPlannerItemIds(): Promise<string[]> {
  if (deletedPlannerIdsInFlight) {
    return deletedPlannerIdsInFlight;
  }

  const run = (async (): Promise<string[]> => {
    let localList: string[] = [];
    try {
      const localRaw = appStorage.getItem(DELETED_ITEMS_STORAGE_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed)) localList = parsed;
      }
    } catch {}

    try {
      const srvData = await fetchServerPlannerDataShared();
      if (srvData && Array.isArray(srvData.deletedPlannerItemIds)) {
        localList = Array.from(new Set([...localList, ...srvData.deletedPlannerItemIds]));
      }
    } catch {}

    if (!isSupabaseConfigured) return localList;

    try {
      const globalRow = await readGlobalPlannerSettingsRow();
      const dbList = globalRow?.settings?.deleted_planner_item_ids;
      if (Array.isArray(dbList)) {
        const combined = Array.from(new Set([...localList, ...dbList]));
        appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(combined));
        return combined;
      }
    } catch (e) {
      console.warn('Error fetching deleted planner item ids:', e);
    }
    return localList;
  })();

  deletedPlannerIdsInFlight = run;
  try {
    return await run;
  } finally {
    if (deletedPlannerIdsInFlight === run) {
      deletedPlannerIdsInFlight = null;
    }
  }
}

export async function saveDeletedPlannerItemId(itemId: string): Promise<void> {
  let currentList = await getDeletedPlannerItemIds();
  if (!currentList.includes(itemId)) {
    currentList = [...currentList, itemId];
  }
  appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(currentList));
  invalidateServerPlannerDataCache();

  if (!isSupabaseConfigured) return;
  await patchGlobalPlannerSettings({ deleted_planner_item_ids: currentList });
}

export async function removeDeletedPlannerItemId(itemId: string): Promise<void> {
  let currentList = await getDeletedPlannerItemIds();
  if (currentList.includes(itemId)) {
    currentList = currentList.filter(id => id !== itemId);
    appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(currentList));
    invalidateServerPlannerDataCache();
    if (isSupabaseConfigured) {
      await patchGlobalPlannerSettings({ deleted_planner_item_ids: currentList });
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
  invalidateServerPlannerDataCache();

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
  invalidateServerPlannerDataCache();

  // Remove any re-inserted IDs from deleted list
  try {
    const deletedList = await getDeletedPlannerItemIds();
    const entryIds = new Set(entries.map((e) => e.id).filter(Boolean));
    const remaining = deletedList.filter((id) => !entryIds.has(id));
    if (remaining.length !== deletedList.length) {
      appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(remaining));
      if (isSupabaseConfigured) {
        await patchGlobalPlannerSettings({ deleted_planner_item_ids: remaining });
      }
    }
  } catch {}

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
  await upsertRowsInChunks('classwork', rows, 50);
}

// =========================================================================
// CRUD Operations for Homework
// =========================================================================

export async function fetchAllHomework(preloadedDeletedIds?: string[]): Promise<HomeworkEntry[]> {
  const deletedIds = preloadedDeletedIds ?? (await getDeletedPlannerItemIds());
  const deletedSet = new Set(deletedIds);

  // 1. Fetch in parallel from both Central Server (/api/planner-data, deduplicated) and paginated Supabase
  const serverPromise = (async (): Promise<{ items: HomeworkEntry[]; ok: boolean }> => {
    const srvData = await fetchServerPlannerDataShared();
    if (srvData && Array.isArray(srvData.homework)) {
      return { items: srvData.homework as HomeworkEntry[], ok: true };
    }
    return { items: [], ok: false };
  })();

  const supabasePromise = (async (): Promise<{ items: HomeworkEntry[]; ok: boolean }> => {
    if (!isSupabaseConfigured) return { items: [], ok: false };
    try {
      const res = await fetchAllRowsPaginated<HomeworkRow>('homework', '*', 'created_at', false, 10000);
      if (!res.error && Array.isArray(res.data)) {
        return { items: res.data.map(rowToHomework), ok: true };
      }
      if (res.error) {
        console.warn('Error fetching homework from Supabase:', res.error.message || res.error);
      }
    } catch (err) {
      console.warn('Network exception fetching homework from Supabase:', err);
    }
    return { items: [], ok: false };
  })();

  const [serverRes, supabaseRes] = await Promise.all([serverPromise, supabasePromise]);
  const serverItems = serverRes.items;
  const dbItems = supabaseRes.items;
  const localCustom = getLocalCustomHomework().filter((h) => h && h.id && !deletedSet.has(h.id));

  // Merge order: INITIAL_HOMEWORK baseline -> Local Custom Items -> Server Items -> Supabase DB Items
  const map = new Map<string, HomeworkEntry>();
  const mergeIntoMap = (incoming: HomeworkEntry) => {
    if (!incoming || !incoming.id || deletedSet.has(incoming.id)) return;
    const prev = map.get(incoming.id);
    if (!prev) {
      map.set(incoming.id, incoming);
      return;
    }
    map.set(incoming.id, {
      ...prev,
      ...incoming,
      links: incoming.links && incoming.links.length > 0 ? incoming.links : prev.links,
      linkTitle: incoming.linkTitle || prev.linkTitle,
      linkUrl: incoming.linkUrl || prev.linkUrl,
      pdfUrl: incoming.pdfUrl || prev.pdfUrl,
    });
  };

  INITIAL_HOMEWORK.forEach(mergeIntoMap);
  localCustom.forEach(mergeIntoMap);
  serverItems.forEach(mergeIntoMap);
  dbItems.forEach(mergeIntoMap);

  const repairedForDb: HomeworkEntry[] = [];
  const dbItemMap = new Map(dbItems.map((h) => [h.id, h]));

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
      if (dbItemMap.has(item.id)) {
        repairedForDb.push(corrected);
      }
      return corrected;
    }

    const isProtectedBaseline =
      ((item.block || 1) === 2 && ((item.week || 1) === 2 || (item.week || 1) === 3)) ||
      ((item.block || 1) === 3 && (item.week || 1) === 2);

    if (isProtectedBaseline) {
      const baseline = INITIAL_HOMEWORK.find((b) => b.id === item.id);
      if (baseline) {
        const updated: HomeworkEntry = {
          ...item,
          task: baseline.task,
          details: baseline.details,
          pages: baseline.pages,
          links: baseline.links,
          linkUrl: baseline.linkUrl,
          linkTitle: baseline.linkTitle,
        };
        const dbMatch = dbItemMap.get(item.id);
        if (
          dbMatch &&
          (dbMatch.task !== updated.task ||
            (dbMatch.details || '') !== (updated.details || '') ||
            (dbMatch.pages || '') !== (updated.pages || '') ||
            (dbMatch.linkUrl || '') !== (updated.linkUrl || '') ||
            (dbMatch.linkTitle || '') !== (updated.linkTitle || '') ||
            JSON.stringify(dbMatch.links || []) !== JSON.stringify(updated.links || []))
        ) {
          repairedForDb.push(updated);
        }
        return updated;
      }
    }

    return item;
  });

  if (deletedSet.size > 0) {
    saveLocalCustomHomework(localCustom, 'replace');
  }

  // Background replication:
  // 1. If Supabase succeeded, push missing items AND repaired items to Supabase
  if (isSupabaseConfigured && supabaseRes.ok) {
    const missingInDb = consolidated.filter((h) => !dbItemMap.has(h.id));
    const toPushMap = new Map<string, HomeworkEntry>();
    missingInDb.forEach((h) => toPushMap.set(h.id, h));
    repairedForDb.forEach((h) => toPushMap.set(h.id, h));
    if (toPushMap.size > 0) {
      const rows = Array.from(toPushMap.values()).map(homeworkToRow);
      upsertRowsInChunks('homework', rows, 50).catch(() => {});
    }
  }

  // 2. If server is missing any Supabase/local items, update central server (without cloud re-mirror loop)
  if (serverRes.ok) {
    const serverItemIds = new Set(serverItems.map((h) => h.id));
    const missingOnServer = consolidated.filter((h) => !serverItemIds.has(h.id));
    if (missingOnServer.length > 0) {
      invalidateServerPlannerDataCache();
      fetch('/api/planner-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-skip-cloud-mirror': '1' },
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
  invalidateServerPlannerDataCache();

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
    invalidateServerPlannerDataCache();

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
  invalidateServerPlannerDataCache();

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
  invalidateServerPlannerDataCache();

  // Remove any re-inserted IDs from deleted list
  try {
    const deletedList = await getDeletedPlannerItemIds();
    const entryIds = new Set(entries.map((e) => e.id).filter(Boolean));
    const remaining = deletedList.filter((id) => !entryIds.has(id));
    if (remaining.length !== deletedList.length) {
      appStorage.setItem(DELETED_ITEMS_STORAGE_KEY, JSON.stringify(remaining));
      if (isSupabaseConfigured) {
        await patchGlobalPlannerSettings({ deleted_planner_item_ids: remaining });
      }
    }
  } catch {}

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
  await upsertRowsInChunks('homework', rows, 50);
}

// =========================================================================
// Planner App Settings (Class, Week, Day, Profile)
// =========================================================================

export async function fetchPlannerSettings(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {};

  try {
    const globalRow = await readGlobalPlannerSettingsRow();
    if (!globalRow) return {};
    const map: Record<string, string> = {};
    if (globalRow.current_block !== undefined) map.current_block = String(globalRow.current_block);
    if (globalRow.current_week !== undefined) map.current_week = String(globalRow.current_week);
    if (globalRow.active_term) map.active_term = String(globalRow.active_term);
    for (const [k, v] of Object.entries(globalRow.settings || {})) {
      map[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return map;
  } catch {
    return {};
  }
}

export async function savePlannerSetting(key: string, value: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const topLevel: { current_block?: number; current_week?: number } = {};
  if (key === 'current_block') topLevel.current_block = Number(value) || 1;
  if (key === 'current_week') topLevel.current_week = Number(value) || 1;
  await patchGlobalPlannerSettings({ [key]: value }, topLevel);
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

  try {
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
  } catch (e) {
    console.warn(`Error fetching student progress for ${studentName}:`, e);
    return null;
  }
}

export async function saveStudentProgressToDb(
  studentName: string,
  completedClassworkIds: string[],
  completedHomeworkIds: string[],
  classId?: ClassId
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
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
  } catch (e) {
    console.warn(`Could not save progress for ${studentName} to Supabase:`, e);
  }
}

export async function fetchKnownStudentsFromDb(): Promise<{ name: string; classId?: ClassId; lastActive: number }[]> {
  if (!isSupabaseConfigured) return [];

  try {
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
  } catch (e) {
    console.warn('Error fetching known students from Supabase:', e);
    return [];
  }
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
      const existingGlobal = await readGlobalPlannerSettingsRow();
      if (!existingGlobal) {
        await patchGlobalPlannerSettings(
          {
            current_class: initialData.nile_planner_current_class_v3 || 'KG1B',
            selected_day: initialData.nile_planner_selected_day_v3 || 'Sunday',
          },
          {
            current_block: 1,
            current_week: Number(initialData.nile_planner_current_week_v3 || 2),
          }
        );
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

    // 1. Check existing classwork (paginated so we never truncate at 1000 rows)
    const { data: cwExisting, error: cwErr } = await fetchAllRowsPaginated<{ id: string }>('classwork', 'id');
    if (!cwErr && Array.isArray(cwExisting)) {
      const existingCwIds = new Set(cwExisting.map((r) => r.id));
      const missingCw = INITIAL_CLASSWORK.filter((c) => c && c.id && !deletedSet.has(c.id) && !existingCwIds.has(c.id));
      if (missingCw.length > 0) {
        await upsertRowsInChunks('classwork', missingCw.map(classworkToRow), 50);
      }
    }

    // 2. Check existing homework (paginated)
    const { data: hwExisting, error: hwErr } = await fetchAllRowsPaginated<{ id: string }>('homework', 'id');
    if (!hwErr && Array.isArray(hwExisting)) {
      const existingHwIds = new Set(hwExisting.map((r) => r.id));
      const missingHw = INITIAL_HOMEWORK.filter((h) => h && h.id && !deletedSet.has(h.id) && !existingHwIds.has(h.id));
      if (missingHw.length > 0) {
        await upsertRowsInChunks('homework', missingHw.map(homeworkToRow), 50);
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
  file_url: string | null;
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
    file_url: effectiveUrl,
    file_data: item.fileData || null,
    uploaded_at: item.uploadedAt || new Date().toISOString(),
  };
}

export function rowToMaterial(row: MaterialRow & { storage_url?: string | null }): MaterialItem {
  const effectiveUrl = row.file_url || row.storage_url || undefined;
  const isPdf = Boolean(
    (row.file_name && row.file_name.toLowerCase().endsWith('.pdf')) ||
    (effectiveUrl && effectiveUrl.toLowerCase().endsWith('.pdf')) ||
    (effectiveUrl && effectiveUrl.includes('/api/materials/')) ||
    (row.file_size && row.file_size > 0)
  );
  const isLink = !isPdf && Boolean(
    effectiveUrl &&
    (effectiveUrl.startsWith('http://') || effectiveUrl.startsWith('https://')) &&
    !effectiveUrl.includes('/api/materials/')
  );

  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    block: row.block,
    section: row.section,
    classId: (row.class_id as ClassId | 'ALL') || 'ALL',
    storageUrl: effectiveUrl,
    linkUrl: isLink ? effectiveUrl : undefined,
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
    let bucketName = 'school_materials';
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${cleanName}`;

    let uploadResult = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
      });

    // Fallback to 'materials' bucket if 'school_materials' fails (e.g. bucket doesn't exist)
    if (uploadResult.error) {
      console.warn(`[Supabase Storage] Upload to '${bucketName}' failed, trying 'materials' bucket:`, uploadResult.error.message);
      bucketName = 'materials';
      uploadResult = await supabase.storage
        .from(bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        });
    }

    if (uploadResult.error) {
      console.warn('Storage upload notice (falling back to database or local):', uploadResult.error.message);
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
 * Fetch all materials metadata from Supabase 'materials' table (Lightweight, excludes heavy base64 file_data for maximum speed)
 */
export async function fetchAllMaterialsFromSupabase(): Promise<MaterialItem[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await fetchAllRowsPaginated<MaterialRow>(
      'materials',
      'id, file_name, file_size, block, section, class_id, file_url, uploaded_at',
      'uploaded_at',
      false,
      8000
    );

    if (error || !Array.isArray(data)) {
      if (error) console.warn('Supabase fetch materials notice:', error.message || error);
      return null;
    }

    return data.map(rowToMaterial);
  } catch (err) {
    console.warn('Network exception fetching materials:', err);
    return null;
  }
}

/**
 * Fetch full file_data base64 for a specific material on demand
 */
export async function fetchMaterialFileData(id: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('file_data')
      .eq('id', id)
      .single();
    if (!error && data && data.file_data) {
      return data.file_data;
    }
  } catch (err) {
    console.warn('Network exception fetching material file data:', err);
  }
  return null;
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

/**
 * Clear all materials from Supabase 'materials' table
 */
export async function clearAllMaterialsFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('materials').delete().neq('id', '___non_existent___');
  } catch (err) {
    console.warn('Network exception clearing materials from Supabase:', err);
  }
}

