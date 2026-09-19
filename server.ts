import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { smartParseWeeklyPlan, cleanAndValidatePlanResult } from './src/utils/smartWeeklyPlanParser';
import dbRouter from './server_db';

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase server-side configuration (safe from browser exposure)
let rawSbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
if (rawSbUrl.endsWith('/rest/v1/')) {
  rawSbUrl = rawSbUrl.substring(0, rawSbUrl.length - 9);
} else if (rawSbUrl.endsWith('/rest/v1')) {
  rawSbUrl = rawSbUrl.substring(0, rawSbUrl.length - 8);
}
const SB_URL = rawSbUrl;
const SB_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isConfigured = Boolean(
  SB_URL &&
  SB_KEY &&
  !SB_URL.includes('placeholder') &&
  (SB_URL.startsWith('http://') || SB_URL.startsWith('https://'))
);

const supabase = isConfigured ? createClient(SB_URL, SB_KEY) : null;

function mapMaterialItemToRow(item: any) {
  return {
    id: item.id,
    file_name: item.fileName || 'unnamed',
    file_size: Number(item.fileSize) || 0,
    file_data: item.fileData || null,
    file_url: item.fileUrl || null,
    block: Number(item.block || item.blockNumber || 1),
    section: item.section || 'Main sheet',
    class_id: item.classId || 'ALL',
    title: item.title || null,
    category: item.category || null,
    notes: item.notes || null,
    uploaded_at: item.uploadedAt || new Date().toISOString(),
  };
}

function mapRowToMaterialItem(row: any) {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileData: row.file_data,
    fileUrl: row.file_url,
    block: row.block,
    section: row.section,
    classId: row.class_id,
    title: row.title,
    category: row.category,
    notes: row.notes,
    uploadedAt: row.uploaded_at,
  };
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(dbRouter);

// Materials Persistent Storage (File + Memory cache + Disk PDF uploads + Deletion Tombstones)
const MATERIALS_FILE = path.join(process.cwd(), 'data', 'materials_store.json');
const MATERIALS_DELETED_FILE = path.join(process.cwd(), 'data', 'materials_deleted.json');
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let inMemoryMaterials: any[] = [];
let deletedMaterialIds: Set<string> = new Set();

try {
  if (fs.existsSync(MATERIALS_DELETED_FILE)) {
    const rawDel = fs.readFileSync(MATERIALS_DELETED_FILE, 'utf-8');
    const parsedDel = JSON.parse(rawDel);
    if (Array.isArray(parsedDel)) {
      deletedMaterialIds = new Set(parsedDel);
    }
  }
} catch (e) {
  console.warn('Could not load deleted materials log:', e);
}

try {
  if (fs.existsSync(MATERIALS_FILE)) {
    const raw = fs.readFileSync(MATERIALS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any tombstoned items
      inMemoryMaterials = parsed.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
    }
    console.log(`Loaded ${inMemoryMaterials.length} materials from disk cache.`);
  }
} catch (e) {
  console.warn('Could not load materials from disk:', e);
}

function persistDeletedIdsToDisk() {
  try {
    const dir = path.dirname(MATERIALS_DELETED_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MATERIALS_DELETED_FILE, JSON.stringify(Array.from(deletedMaterialIds)), 'utf-8');
  } catch (e) {
    console.error('Failed to write deleted materials to disk:', e);
  }
}

// Helper to save binary PDF to disk from Base64 Data URL and return public endpoint URL
function savePdfFromItem(item: any): string | null {
  try {
    if (!item || !item.id) return null;
    const filePath = path.join(UPLOADS_DIR, `${item.id}.pdf`);

    // 1. If base64 fileData is provided, write to disk
    if (item.fileData && typeof item.fileData === 'string') {
      const b64 = item.fileData.includes(',') ? item.fileData.split(',')[1] : item.fileData;
      const buf = Buffer.from(b64, 'base64');
      fs.writeFileSync(filePath, buf);
      return `/api/materials/pdf/${item.id}`;
    }

    // 2. If file already exists on disk
    if (fs.existsSync(filePath)) {
      return `/api/materials/pdf/${item.id}`;
    }
  } catch (err) {
    console.warn(`Error saving PDF for item ${item?.id}:`, err);
  }
  return null;
}

function persistMaterialsToDisk() {
  try {
    const dir = path.dirname(MATERIALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Sanitize in-memory items so materials_store.json does not carry huge base64 strings
    const sanitized = inMemoryMaterials
      .filter((m) => m && m.id && !deletedMaterialIds.has(m.id))
      .map((m) => {
        const copy = { ...m };
        if (copy.fileData && copy.fileUrl) {
          delete copy.fileData;
        }
        return copy;
      });
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write materials to disk:', e);
  }
}

// Materials API Endpoints (Sync Mobile ⇄ Laptop)

// 1. Get All Materials
app.get('/api/materials', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('materials').select('*');
      if (!error && data) {
        const serverItems = data.map(mapRowToMaterialItem);
        inMemoryMaterials = serverItems.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
        persistMaterialsToDisk();
      } else if (error) {
        console.error('Supabase fetch materials warning:', error);
      }
    }
    const activeMaterials = inMemoryMaterials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
    res.json({
      success: true,
      materials: activeMaterials,
      deletedIds: Array.from(deletedMaterialIds),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Serve PDF file binary directly with correct headers and cache
app.get('/api/materials/pdf/:id', async (req, res) => {
  const { id } = req.params;
  if (deletedMaterialIds.has(id)) {
    return res.status(404).json({ success: false, error: 'File has been deleted' });
  }

  const filePath = path.join(UPLOADS_DIR, `${id}.pdf`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }

    // 1. Try to fetch from Supabase Storage or Database directly!
  if (supabase) {
    try {
      const storageFileName = `${id}.pdf`;
      const fullPath = `uploads/${storageFileName}`;

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('materials')
        .download(fullPath);

      if (!downloadError && fileBlob) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        fs.writeFileSync(filePath, buf);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buf);
      }

      // Database fallback
      const { data, error } = await supabase
        .from('materials')
        .select('file_data, file_url')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        if (data.file_data) {
          const b64 = data.file_data.includes(',') ? data.file_data.split(',')[1] : data.file_data;
          const buf = Buffer.from(b64, 'base64');
          fs.writeFileSync(filePath, buf);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buf);
        } else if (data.file_url) {
          const fetchRes = await fetch(data.file_url);
          if (fetchRes.ok) {
            const arrayBuffer = await fetchRes.arrayBuffer();
            const buf = Buffer.from(arrayBuffer);
            fs.writeFileSync(filePath, buf);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(buf);
          }
        }
      }
    } catch (sbErr) {
      console.warn('Direct Supabase PDF fetch exception:', sbErr);
    }
  }

  // 2. Fallback: check in-memory if item has fileData
  const found = inMemoryMaterials.find((m) => m.id === id);
  if (found && found.fileData && typeof found.fileData === 'string') {
    try {
      const b64 = found.fileData.includes(',') ? found.fileData.split(',')[1] : found.fileData;
      const buf = Buffer.from(b64, 'base64');
      fs.writeFileSync(filePath, buf);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buf);
    } catch (e) {
      console.warn('Fallback stream error:', e);
    }
  }

  res.status(404).json({ success: false, error: 'PDF file not found' });
});

// 3. Bidirectional Sync: Accepts client's local materials & deletedIds, merges them, and returns complete clean list
app.post('/api/materials/sync', async (req, res) => {
  try {
    const { materials, deletedIds: clientDeletedIds } = req.body;
    let changed = false;

    // A. Merge client deleted IDs (tombstones)
    if (Array.isArray(clientDeletedIds) && clientDeletedIds.length > 0) {
      for (const delId of clientDeletedIds) {
        if (typeof delId === 'string' && delId && !deletedMaterialIds.has(delId)) {
          deletedMaterialIds.add(delId);
          changed = true;
          // Delete file from disk if present
          const filePath = path.join(UPLOADS_DIR, `${delId}.pdf`);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch {}
          }
        }
      }
    }

    // Always remove tombstoned items from in-memory list
    const beforeCount = inMemoryMaterials.length;
    inMemoryMaterials = inMemoryMaterials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
    if (inMemoryMaterials.length !== beforeCount) {
      changed = true;
    }

    // B. Merge incoming materials (STRICTLY IGNORING any deleted IDs)
    if (Array.isArray(materials) && materials.length > 0) {
      for (const clientItem of materials) {
        if (!clientItem || !clientItem.id) continue;
        // Never allow a deleted item to resurrect
        if (deletedMaterialIds.has(clientItem.id)) {
          continue;
        }

        const existingIdx = inMemoryMaterials.findIndex((m) => m.id === clientItem.id);

        let publicUrl = null;
        if (supabase && clientItem.fileData) {
          try {
            const b64 = clientItem.fileData.includes(',') ? clientItem.fileData.split(',')[1] : clientItem.fileData;
            const buf = Buffer.from(b64, 'base64');
            const storageFileName = `${clientItem.id}.pdf`;
            const fullPath = `uploads/${storageFileName}`;

            // Upload to materials bucket under uploads/ subfolder
            const { error: uploadError } = await supabase.storage
              .from('materials')
              .upload(fullPath, buf, {
                contentType: 'application/pdf',
                upsert: true
              });

            if (!uploadError) {
              publicUrl = supabase.storage.from('materials').getPublicUrl('uploads/' + storageFileName).data.publicUrl;
            }
          } catch (storageErr) {
            console.error('Sync Supabase Storage exception:', storageErr);
          }
        }

        const pdfUrl = savePdfFromItem(clientItem);
        const cleanItem = { ...clientItem };
        if (publicUrl) {
          cleanItem.fileUrl = publicUrl;
        } else if (pdfUrl) {
          cleanItem.fileUrl = pdfUrl;
        }

        if (existingIdx >= 0) {
          // Merge metadata
          inMemoryMaterials[existingIdx] = {
            ...inMemoryMaterials[existingIdx],
            ...cleanItem,
            fileUrl: cleanItem.fileUrl || inMemoryMaterials[existingIdx].fileUrl,
          };
          changed = true;
        } else {
          inMemoryMaterials.unshift(cleanItem);
          changed = true;
        }
      }
    }

    if (changed) {
      persistMaterialsToDisk();
      persistDeletedIdsToDisk();
    }

    if (supabase) {
      try {
        const allDeleted = Array.from(deletedMaterialIds);
        if (allDeleted.length > 0) {
          await supabase.from('materials').delete().in('id', allDeleted);
        }
        const rows = inMemoryMaterials.map(mapMaterialItemToRow);
        if (rows.length > 0) {
          await supabase.from('materials').upsert(rows);
        }
      } catch (sbErr) {
        console.error('Supabase sync database operation failure:', sbErr);
      }
    }

    const activeMaterials = inMemoryMaterials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
    res.json({
      success: true,
      materials: activeMaterials,
      deletedIds: Array.from(deletedMaterialIds),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Save/Update Single Material (Un-tombstone if re-uploaded intentionally)
app.post('/api/materials/upload-file', async (req, res) => {
  try {
    const { fileData, fileName, materialId } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: 'fileData is required' });
    }

    const storageFileName = materialId ? `${materialId}.pdf` : (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    const matId = materialId || storageFileName.replace('.pdf', '');

    // 1. Decode base64 and write to local UPLOADS_DIR immediately
    const b64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buf = Buffer.from(b64, 'base64');
    
    const localFilePath = path.join(UPLOADS_DIR, `${matId}.pdf`);
    fs.writeFileSync(localFilePath, buf);
    console.log(`Saved PDF locally on server disk: ${localFilePath}`);

    // Default URL is the local server endpoint
    let publicUrl = `/api/materials/pdf/${matId}`;

    // 2. Upload to Supabase Storage Bucket if configured
    if (supabase) {
      try {
        const fullPath = `uploads/${matId}.pdf`;
        
        // Define a promise that uploads to storage
        const uploadPromise = supabase.storage
          .from('materials')
          .upload(fullPath, buf, {
            contentType: 'application/pdf',
            upsert: true
          });

        // Define a 3.5 second timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase Storage Upload Timeout')), 3500)
        );

        // Race them!
        const result: any = await Promise.race([uploadPromise, timeoutPromise]);
        
        if (result && result.error) {
          console.error('Supabase Storage upload returned error:', result.error);
        } else {
          // Success! Fetch public url
          const sUrl = supabase.storage.from('materials').getPublicUrl(fullPath).data.publicUrl;
          if (sUrl) {
            publicUrl = sUrl;
            console.log('Server successfully uploaded PDF to Supabase Storage:', publicUrl);
          }
        }
      } catch (err: any) {
        console.warn('Supabase storage upload bypassed or timed out:', err.message);
      }
    }

    return res.json({ success: true, publicUrl });
  } catch (err: any) {
    console.error('Server upload handler exception:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/materials/single', async (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ success: false, error: 'Valid material item with id is required' });
    }

    // If item was previously marked as deleted, remove from tombstone on explicit new upload
    if (deletedMaterialIds.has(item.id)) {
      deletedMaterialIds.delete(item.id);
      persistDeletedIdsToDisk();
    }

    let publicUrl = null;
    if (supabase && item.fileData) {
      try {
        // Auto-create bucket if missing
        try {
          await supabase.storage.createBucket('materials', { public: true });
        } catch {}

        const b64 = item.fileData.includes(',') ? item.fileData.split(',')[1] : item.fileData;
        const buf = Buffer.from(b64, 'base64');
        const storageFileName = `${item.id}.pdf`;
        const fullPath = `uploads/${storageFileName}`;

        // Upload to materials bucket under uploads/ subfolder
        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(fullPath, buf, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
        } else {
          // Retrieve the public URL using the user's exact required format:
          publicUrl = supabase.storage.from('materials').getPublicUrl('uploads/' + storageFileName).data.publicUrl;
          console.log('Successfully uploaded PDF to Supabase Storage. Public URL:', publicUrl);
        }
      } catch (storageErr) {
        console.error('Supabase Storage exception:', storageErr);
      }
    }

    const pdfUrl = savePdfFromItem(item);
    const cleanItem = { ...item };
    if (publicUrl) {
      cleanItem.fileUrl = publicUrl;
    } else if (pdfUrl) {
      cleanItem.fileUrl = pdfUrl;
    }

    const idx = inMemoryMaterials.findIndex((m) => m.id === item.id);
    if (idx >= 0) {
      inMemoryMaterials[idx] = cleanItem;
    } else {
      inMemoryMaterials.unshift(cleanItem);
    }

    persistMaterialsToDisk();

    let supabaseError = null;
    if (supabase) {
      try {
        const row = mapMaterialItemToRow(cleanItem);
        const { error } = await supabase.from('materials').upsert(row);
        if (error) {
          console.error('Supabase single upsert warning:', error);
          supabaseError = error;
        }
      } catch (sbErr: any) {
        console.error('Supabase single upsert error:', sbErr);
        supabaseError = { message: sbErr.message || 'Exception occurred' };
      }
    }

    res.json({ success: true, material: cleanItem, supabaseError });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Bulk Save
app.post('/api/materials/save', async (req, res) => {
  try {
    const { materials } = req.body;
    if (Array.isArray(materials)) {
      for (const m of materials) {
        if (m && m.id) {
          deletedMaterialIds.delete(m.id);

          let publicUrl = null;
          if (supabase && m.fileData) {
            try {
              const b64 = m.fileData.includes(',') ? m.fileData.split(',')[1] : m.fileData;
              const buf = Buffer.from(b64, 'base64');
              const storageFileName = `${m.id}.pdf`;
              const fullPath = `uploads/${storageFileName}`;

              // Upload to materials bucket under uploads/ subfolder
              const { error: uploadError } = await supabase.storage
                .from('materials')
                .upload(fullPath, buf, {
                  contentType: 'application/pdf',
                  upsert: true
                });

              if (!uploadError) {
                publicUrl = supabase.storage.from('materials').getPublicUrl('uploads/' + storageFileName).data.publicUrl;
              }
            } catch (storageErr) {
              console.error('Bulk save Supabase Storage exception:', storageErr);
            }
          }

          const pdfUrl = savePdfFromItem(m);
          if (publicUrl) {
            m.fileUrl = publicUrl;
          } else if (pdfUrl) {
            m.fileUrl = pdfUrl;
          }
        }
      }
      inMemoryMaterials = materials.filter((m) => m && m.id && !deletedMaterialIds.has(m.id));
      persistMaterialsToDisk();
      persistDeletedIdsToDisk();

      if (supabase) {
        try {
          const rows = inMemoryMaterials.map(mapMaterialItemToRow);
          if (rows.length > 0) {
            const { error } = await supabase.from('materials').upsert(rows);
            if (error) console.error('Supabase bulk save warning:', error);
          }
        } catch (sbErr) {
          console.error('Supabase bulk save error:', sbErr);
        }
      }

      return res.json({ success: true, count: inMemoryMaterials.length });
    }
    res.status(400).json({ success: false, error: 'materials array is required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Delete Material (Permanent Deletion across all devices)
app.delete('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      deletedMaterialIds.add(id);
      inMemoryMaterials = inMemoryMaterials.filter((m) => m.id !== id);
      persistMaterialsToDisk();
      persistDeletedIdsToDisk();

      // Remove PDF file from disk
      const filePath = path.join(UPLOADS_DIR, `${id}.pdf`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }

      if (supabase) {
        try {
          const { error } = await supabase.from('materials').delete().eq('id', id);
          if (error) console.error('Supabase delete material warning:', error);
        } catch (sbErr) {
          console.error('Supabase delete material error:', sbErr);
        }
      }
    }

    res.json({ success: true, deletedId: id, deletedIds: Array.from(deletedMaterialIds) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Clear All Materials
app.post('/api/materials/clear', async (req, res) => {
  try {
    for (const m of inMemoryMaterials) {
      if (m && m.id) {
        deletedMaterialIds.add(m.id);
        const filePath = path.join(UPLOADS_DIR, `${m.id}.pdf`);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {}
        }
      }
    }
    inMemoryMaterials = [];
    persistMaterialsToDisk();
    persistDeletedIdsToDisk();

    // Clean uploads directory
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(UPLOADS_DIR, file));
        }
      }
    } catch (e) {
      console.warn('Error clearing uploads dir:', e);
    }

    if (supabase) {
      try {
        const { error } = await supabase.from('materials').delete().neq('id', 'placeholder');
        if (error) console.error('Supabase clear materials warning:', error);
      } catch (sbErr) {
        console.error('Supabase clear materials error:', sbErr);
      }
    }

    res.json({ success: true, message: 'All materials cleared from server' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to get GoogleGenAI client safely (lazy initialization)
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoint to parse Weekly Plan using Gemini or smart deterministic fallback
app.post('/api/parse-weekly-plan', async (req, res) => {
  try {
    const { planText, classId, subjectHint } = req.body;
    if (!planText || typeof planText !== 'string') {
      return res.status(400).json({ error: 'planText is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      console.log('No GEMINI_API_KEY set, using smart deterministic parser.');
      const parsed = smartParseWeeklyPlan(planText, classId, subjectHint);
      return res.json(parsed);
    }

    const subjectContext = subjectHint && subjectHint !== 'ALL'
      ? `IMPORTANT: The weekly plan is primarily for the subject "${subjectHint}". Unless a row/item explicitly specifies another subject, set "subject" to "${subjectHint}".`
      : '';

    const prompt = `
You are an expert school curriculum table parser for Nile Egyptian International School, KG 1 (${classId || 'KG1A'}).
The user provided a weekly plan table (typically in Arabic).
${subjectContext}

CRITICAL USER MANDATES FOR EXTRACTING COLUMNS:
1. الكلاس وورك (classwork):
   - اقرأ العمود بتاع "الدرس" (أو "اسم الدرس") مع عمود "مصدر الصف" (أو "مصادر التعلم" / "مصادر الصف")، واكتبهما في الكلاس وورك (classwork).
   - "title": اسم الدرس فقط من عمود الدرس (e.g. "التعرف على الروتين اليومي وأنواع الخطوط").
   - "pages": أرقام الصفحات وأوراق العمل من عمود مصدر الصف (e.g. "كتاب التلميذ ص 3", "حل ورقة عمل 4 و 5").
   - "details": أي تفاصيل إضافية من عمود مصدر الصف.
   - "links": روابط فيديوهات الشرح الموجهة للصف من عمود مصدر الصف.
   - لا تضع أبداً محتوى مصدر الصف في الهوم وورك، بل يكتب في الكلاس وورك.

2. الهوم وورك (homework):
   - اقرأ العمود بتاع "الواجب المنزلي" (أو الواجب) وضعه في الهوم وورك (homework).
   - "task": نص الواجب المنزلي من عمود الواجب فقط.
   - إذا كان مكتوباً "لا يوجد واجب" أو "-" أو فارغاً أو لا توجد تفاصيل، فلا تضف أي عنصر في مصفوفة homework لهذا اليوم ومادة هذه الحصة نهائياً.
   - "links": أي روابط واجبات منزلية أو فيديوهات تدريب منزلي.

3. التومورو (tomorrowNotes):
   - لو لقيت أي حاجة تخص كلمة "ملاحظات" أو "ملاحظة" (سواء في عمود "ملاحظات" في الجدول، أو أي سطر يحتوي على كلمة ملاحظات أو ملاحظة في أي مكان في النص)، ضعها فوراً وبشكل كامل في التومورو (tomorrowNotes).
   - "note": نص الملاحظة كاملاً.
   - "arabicNote": نص الملاحظة بالعربي.
   - "targetDay": اليوم التابع للملاحظة في الجدول.

Return ONLY valid JSON matching this schema:
{
  "classwork": [
    {
      "classId": "${classId || 'KG1A'}",
      "day": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
      "period": 1,
      "subject": "Arabic",
      "title": "Clean lesson title (اسم الدرس من عمود الدرس)",
      "pages": "Worksheet or book pages from عمود مصدر الصف",
      "details": "Optional extra resource details from عمود مصدر الصف",
      "completed": false,
      "linkUrl": "Optional first URL",
      "links": [{ "url": "https://...", "title": "فيديو الشرح", "type": "video" }]
    }
  ],
  "homework": [
    {
      "classId": "${classId || 'KG1A'}",
      "assignedDay": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
      "dueDay": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Sunday",
      "subject": "Arabic",
      "task": "Clean homework task (من عمود الواجب المنزلي)",
      "pages": "Optional page numbers",
      "completed": false,
      "priority": "normal",
      "linkUrl": "Optional first URL",
      "links": [{ "url": "https://...", "title": "رابط الواجب", "type": "video" }]
    }
  ],
  "tomorrowNotes": [
    {
      "classId": "${classId || 'KG1A'}",
      "targetDay": "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday",
      "subject": "Arabic",
      "note": "أي نص يخص كلمة ملاحظات يوضع هنا في التومورو",
      "arabicNote": "نص الملاحظة بالعربي",
      "bagItem": "Optional item to pack"
    }
  ]
}

Weekly Plan Input Text:
${planText}
`;

    let textOutput = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      textOutput = response.text || '';
    } catch (aiErr: any) {
      console.warn('Gemini generateContent with gemini-3.8-flash error, trying fallback:', aiErr?.message || aiErr);
      try {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        textOutput = fallbackResp.text || '';
      } catch (fallbackErr) {
        console.warn('Gemini generateContent fallback error, attempting deterministic parser:', fallbackErr);
      }
    }

    if (textOutput) {
      try {
        const parsed = JSON.parse(textOutput);
        const cleaned = cleanAndValidatePlanResult(
          {
            classwork: parsed.classwork || [],
            homework: parsed.homework || [],
            tomorrowNotes: parsed.tomorrowNotes || [],
          },
          classId || 'KG1A',
          subjectHint || 'Arabic'
        );
        if (cleaned.classwork.length > 0 || cleaned.homework.length > 0) {
          return res.json(cleaned);
        }
      } catch (parseErr) {
        console.warn('Failed to parse Gemini output as JSON:', parseErr);
      }
    }

    // Fallback to smart deterministic parser
    const fallback = smartParseWeeklyPlan(planText, classId || 'KG1A', subjectHint || 'Arabic');
    const cleanedFallback = cleanAndValidatePlanResult(fallback, classId || 'KG1A', subjectHint || 'Arabic');
    return res.json(cleanedFallback);
  } catch (error: any) {
    console.error('Error in /api/parse-weekly-plan:', error);
    const fallback = smartParseWeeklyPlan(req.body?.planText || '', req.body?.classId || 'KG1A', req.body?.subjectHint || 'Arabic');
    const cleanedFallback = cleanAndValidatePlanResult(fallback, req.body?.classId || 'KG1A', req.body?.subjectHint || 'Arabic');
    return res.json(cleanedFallback);
  }
});

// PDF Worker static endpoints for reliable client-side rendering
app.get('/pdf.worker.min.mjs', (req, res) => {
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const workerFile = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
  if (fs.existsSync(workerFile)) {
    return res.sendFile(workerFile);
  }
  const publicWorker = path.join(process.cwd(), 'public', 'pdf.worker.min.mjs');
  if (fs.existsSync(publicWorker)) {
    return res.sendFile(publicWorker);
  }
  res.status(404).send('pdf.worker.min.mjs not found');
});

app.get('/pdf.worker.legacy.min.mjs', (req, res) => {
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const workerFile = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
  if (fs.existsSync(workerFile)) {
    return res.sendFile(workerFile);
  }
  res.status(404).send('pdf.worker.legacy.min.mjs not found');
});

// Serve public directory
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
