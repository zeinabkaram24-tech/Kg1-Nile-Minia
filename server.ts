import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "visitors.json");
const MATERIALS_FILES_DIR = path.join(DATA_DIR, "materials_files");
const PUBLIC_MATERIALS_DIR = path.join(process.cwd(), "public", "materials_files");
const MATERIALS_DB_FILE = path.join(DATA_DIR, "materials.json");
const GLOBAL_PLAN_FILE = path.join(DATA_DIR, "global_plan.json");

if (!fs.existsSync(MATERIALS_FILES_DIR)) {
  fs.mkdirSync(MATERIALS_FILES_DIR, { recursive: true });
}
if (!fs.existsSync(PUBLIC_MATERIALS_DIR)) {
  fs.mkdirSync(PUBLIC_MATERIALS_DIR, { recursive: true });
}

// Multer storage setup for original sheet files (PDFs, docs)
const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MATERIALS_FILES_DIR);
  },
  filename: (_req, file, cb) => {
    let name = file.originalname;
    try {
      name = Buffer.from(file.originalname, "latin1").toString("utf8");
    } catch {
      name = file.originalname;
    }
    cb(null, name);
  },
});

const uploadMiddleware = multer({
  storage: multerStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for full original PDF booklets
});

function findMaterialFilePath(filename: string): string | null {
  try {
    const decoded = decodeURIComponent(filename);
    const candidates = [
      path.join(MATERIALS_FILES_DIR, decoded),
      path.join(MATERIALS_FILES_DIR, filename),
      path.join(PUBLIC_MATERIALS_DIR, decoded),
      path.join(PUBLIC_MATERIALS_DIR, filename),
      path.join(process.cwd(), decoded),
      path.join(process.cwd(), filename),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
    // Case-insensitive match fallback in folders
    if (fs.existsSync(MATERIALS_FILES_DIR)) {
      const allFiles = fs.readdirSync(MATERIALS_FILES_DIR);
      const match = allFiles.find(
        (f) =>
          f.toLowerCase() === decoded.toLowerCase() ||
          f.toLowerCase() === filename.toLowerCase()
      );
      if (match) return path.join(MATERIALS_FILES_DIR, match);
    }
    if (fs.existsSync(PUBLIC_MATERIALS_DIR)) {
      const allFiles = fs.readdirSync(PUBLIC_MATERIALS_DIR);
      const match = allFiles.find(
        (f) =>
          f.toLowerCase() === decoded.toLowerCase() ||
          f.toLowerCase() === filename.toLowerCase()
      );
      if (match) return path.join(PUBLIC_MATERIALS_DIR, match);
    }
    // Check root directory for original uploaded user PDF files
    const rootFiles = fs.readdirSync(process.cwd());
    const matchRoot = rootFiles.find(
      (f) =>
        f.toLowerCase() === decoded.toLowerCase() ||
        f.toLowerCase() === filename.toLowerCase()
    );
    if (matchRoot) return path.join(process.cwd(), matchRoot);
  } catch (err) {
    console.warn("findMaterialFilePath error:", err);
  }
  return null;
}

interface VisitorItem {
  id: string;
  name: string;
  loginType: 'student' | 'visitor' | 'admin';
  studentGrade?: string;
  section?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  visitCount: number;
  dailyVisits?: Record<string, number>;
  device?: string;
  email?: string;
  userAgent?: string;
}

interface VisitorsDatabase {
  visitors: VisitorItem[];
  lastUpdated: number;
}

// Calendar day string in Egypt timezone (Africa/Cairo): "YYYY-MM-DD"
// Midnight (12:00 AM) strictly starts a new calendar date
function getCairoDateKey(timestamp: number = Date.now()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date(timestamp));
  } catch {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

// Descriptive Arabic label for Egypt date: e.g. "الأحد، 6 سبتمبر 2026"
function getCairoDateLabel(timestamp: number = Date.now()): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleDateString('ar-EG');
  }
}

function calculateStats(visitors: VisitorItem[], lastUpdated: number) {
  const todayKey = getCairoDateKey();
  const todayDateLabel = getCairoDateLabel();

  // Cumulative all-time stats
  const totalUsers = visitors.length;
  const totalStudentsNamed = visitors.filter((v) => v.loginType === 'student').length;
  const totalVisitorsGuest = visitors.filter((v) => v.loginType === 'visitor').length;
  const totalVisits = visitors.reduce((acc, v) => acc + (v.visitCount || 1), 0);

  // STRICT DAILY CENSUS: from 12:00 AM midnight to 12:00 AM next day
  // Resets completely to 0 at 12:00 AM for the new day
  const activeTodayVisitors = visitors.filter((v) => {
    if (v.dailyVisits && typeof v.dailyVisits[todayKey] === 'number' && v.dailyVisits[todayKey] > 0) {
      return true;
    }
    return getCairoDateKey(v.lastSeenAt) === todayKey;
  });

  const todayStudentsNamed = activeTodayVisitors.filter((v) => v.loginType === 'student').length;
  const todayVisitorsGuest = activeTodayVisitors.filter((v) => v.loginType === 'visitor').length;
  const todayTotalUsers = activeTodayVisitors.length;

  // Total session/platform visits recorded today since 12:00 AM midnight
  const todayVisits = activeTodayVisitors.reduce((acc, v) => {
    if (v.dailyVisits && typeof v.dailyVisits[todayKey] === 'number') {
      return acc + v.dailyVisits[todayKey];
    }
    return acc + (getCairoDateKey(v.lastSeenAt) === todayKey ? 1 : 0);
  }, 0);

  // Cumulative Section Counts
  const sectionCounts = {
    '2A': visitors.filter((v) => v.section === '2A' || (v.studentGrade && v.studentGrade.includes('2A'))).length,
    '2B': visitors.filter((v) => v.section === '2B' || (v.studentGrade && v.studentGrade.includes('2B'))).length,
    '2C': visitors.filter((v) => v.section === '2C' || (v.studentGrade && v.studentGrade.includes('2C'))).length,
    other: visitors.filter((v) => {
      const isA = v.section === '2A' || (v.studentGrade && v.studentGrade.includes('2A'));
      const isB = v.section === '2B' || (v.studentGrade && v.studentGrade.includes('2B'));
      const isC = v.section === '2C' || (v.studentGrade && v.studentGrade.includes('2C'));
      return !isA && !isB && !isC;
    }).length,
  };

  // Today's Section Counts
  const todaySectionCounts = {
    '2A': activeTodayVisitors.filter((v) => v.section === '2A' || (v.studentGrade && v.studentGrade.includes('2A'))).length,
    '2B': activeTodayVisitors.filter((v) => v.section === '2B' || (v.studentGrade && v.studentGrade.includes('2B'))).length,
    '2C': activeTodayVisitors.filter((v) => v.section === '2C' || (v.studentGrade && v.studentGrade.includes('2C'))).length,
    other: activeTodayVisitors.filter((v) => {
      const isA = v.section === '2A' || (v.studentGrade && v.studentGrade.includes('2A'));
      const isB = v.section === '2B' || (v.studentGrade && v.studentGrade.includes('2B'));
      const isC = v.section === '2C' || (v.studentGrade && v.studentGrade.includes('2C'));
      return !isA && !isB && !isC;
    }).length,
  };

  return {
    totalUsers,
    totalStudentsNamed,
    totalVisitorsGuest,
    totalVisits,
    todayDateString: todayKey,
    todayDateLabel,
    todayTotalUsers,
    todayStudentsNamed,
    todayVisitorsGuest,
    todayVisits,
    lastUpdated,
    sectionCounts,
    todaySectionCounts,
  };
}

// Ensure data folder and database file exist
function initDatabase(): VisitorsDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed: VisitorsDatabase = JSON.parse(content);
      // Normalize existing records
      if (Array.isArray(parsed.visitors)) {
        parsed.visitors = parsed.visitors.map((v: any) => {
          let loginType: 'student' | 'visitor' | 'admin' = v.loginType || 'student';
          if (v.id === 'owner-zeinab' || (v.name && v.name.includes('المسؤول'))) {
            loginType = 'admin';
          } else if (!v.name || v.name.trim() === 'زائر' || v.name.startsWith('زائر') || v.name === 'Guest') {
            loginType = 'visitor';
          }
          return {
            id: v.id || `vis-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: v.name || (loginType === 'visitor' ? 'زائر' : 'طالب'),
            loginType,
            studentGrade: v.studentGrade || (loginType === 'visitor' ? 'زائر' : 'Grade 2'),
            section: v.section || (v.studentGrade && v.studentGrade.includes('2A') ? '2A' : v.studentGrade && v.studentGrade.includes('2B') ? '2B' : v.studentGrade && v.studentGrade.includes('2C') ? '2C' : undefined),
            firstSeenAt: v.firstSeenAt || Date.now(),
            lastSeenAt: v.lastSeenAt || Date.now(),
            visitCount: v.visitCount || 1,
            dailyVisits: v.dailyVisits || {},
            device: v.device || 'متصفح ويب',
            email: v.email,
            userAgent: v.userAgent,
          };
        });
      }
      return parsed;
    }
  } catch (err) {
    console.error("Error initializing visitors db:", err);
  }

  const initial: VisitorsDatabase = {
    visitors: [
      {
        id: "owner-zeinab",
        name: "الأستاذة زينب (المسؤول)",
        loginType: "admin",
        studentGrade: "Grade 2",
        section: "all",
        firstSeenAt: Date.now() - 86400000 * 5,
        lastSeenAt: Date.now(),
        visitCount: 15,
        device: "Admin Account",
        email: "zeinabkaram909@gmail.com",
      },
    ],
    lastUpdated: Date.now(),
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write initial visitors db:", err);
  }

  return initial;
}

function saveDatabase(db: VisitorsDatabase) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.lastUpdated = Date.now();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save visitors db:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Static material file routes
  app.use("/materials_files", express.static(MATERIALS_FILES_DIR));
  app.use("/public/materials_files", express.static(PUBLIC_MATERIALS_DIR));

  let db = initDatabase();

  // 1. Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // 2. Public summary stats (Total users, students logged in by name, visitors, total visits)
  app.get("/api/visitors/stats", (_req, res) => {
    const stats = calculateStats(db.visitors, db.lastUpdated);
    res.json(stats);
  });

  // 3. Register or log a student by name OR guest visitor
  app.post("/api/visitors/register", (req, res) => {
    const {
      name,
      studentName,
      studentGrade,
      section,
      isGuest,
      visitorId,
      userAgent,
      device,
    } = req.body || {};

    const cleanName = (typeof studentName === "string" && studentName.trim())
      ? studentName.trim()
      : (typeof name === "string" && name.trim())
      ? name.trim()
      : "";

    const isExplicitGuest = Boolean(isGuest) || (!cleanName && Boolean(visitorId));
    const cleanSection = typeof section === "string" && ['2A', '2B', '2C'].includes(section) ? section : undefined;
    const cleanGrade = typeof studentGrade === "string" && studentGrade.trim()
      ? studentGrade.trim()
      : cleanSection
      ? `Grade ${cleanSection}`
      : "Grade 2";

    let resultVisitor: VisitorItem;
    let isNew = false;
    const todayKey = getCairoDateKey();

    if (isExplicitGuest && !cleanName) {
      // Guest Visitor without name
      const existingGuestIndex = db.visitors.findIndex(
        (v) => (visitorId && v.id === visitorId)
      );

      if (existingGuestIndex >= 0) {
        const existing = db.visitors[existingGuestIndex];
        existing.lastSeenAt = Date.now();
        existing.visitCount = (existing.visitCount || 1) + 1;
        if (!existing.dailyVisits) existing.dailyVisits = {};
        existing.dailyVisits[todayKey] = (existing.dailyVisits[todayKey] || 0) + 1;
        if (cleanSection) existing.section = cleanSection;
        if (device) existing.device = device;
        resultVisitor = existing;
      } else {
        isNew = true;
        const dailyVisits: Record<string, number> = {};
        dailyVisits[todayKey] = 1;
        resultVisitor = {
          id: visitorId || `vis-guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: "زائر",
          loginType: "visitor",
          studentGrade: cleanSection ? `زائر (فصل ${cleanSection})` : "زائر",
          section: cleanSection,
          firstSeenAt: Date.now(),
          lastSeenAt: Date.now(),
          visitCount: 1,
          dailyVisits,
          userAgent: typeof userAgent === "string" ? userAgent.substring(0, 150) : undefined,
          device: typeof device === "string" ? device : "متصفح ويب",
        };
        db.visitors.unshift(resultVisitor);
      }
    } else {
      // Student Logging In By Name
      if (!cleanName || cleanName.length < 2) {
        return res.status(400).json({ error: "اسم الطالب مطلوب لتسجيل الدخول (حرفين على الأقل)" });
      }

      // Check if student with same name exists, or promote existing guest with visitorId
      const existingIndex = db.visitors.findIndex(
        (v) => (v.name && v.name.toLowerCase() === cleanName.toLowerCase()) ||
               (visitorId && v.id === visitorId)
      );

      if (existingIndex >= 0) {
        const existing = db.visitors[existingIndex];
        existing.name = cleanName;
        existing.loginType = "student";
        existing.lastSeenAt = Date.now();
        existing.visitCount = (existing.visitCount || 1) + 1;
        if (!existing.dailyVisits) existing.dailyVisits = {};
        existing.dailyVisits[todayKey] = (existing.dailyVisits[todayKey] || 0) + 1;
        if (cleanGrade) existing.studentGrade = cleanGrade;
        if (cleanSection) existing.section = cleanSection;
        if (device) existing.device = device;
        resultVisitor = existing;
      } else {
        isNew = true;
        const dailyVisits: Record<string, number> = {};
        dailyVisits[todayKey] = 1;
        resultVisitor = {
          id: visitorId || `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: cleanName,
          loginType: "student",
          studentGrade: cleanGrade,
          section: cleanSection,
          firstSeenAt: Date.now(),
          lastSeenAt: Date.now(),
          visitCount: 1,
          dailyVisits,
          userAgent: typeof userAgent === "string" ? userAgent.substring(0, 150) : undefined,
          device: typeof device === "string" ? device : "متصفح ويب",
        };
        db.visitors.unshift(resultVisitor);
      }
    }

    saveDatabase(db);

    const stats = calculateStats(db.visitors, db.lastUpdated);

    res.json({
      success: true,
      isNew,
      visitor: resultVisitor,
      stats,
      totalUsers: db.visitors.length,
      totalStudentsNamed: stats.totalStudentsNamed,
      totalVisitorsGuest: stats.totalVisitorsGuest,
    });
  });

  // 4. Ping to keep visit record fresh when reopening app
  app.post("/api/visitors/ping", (req, res) => {
    const { studentName, name, visitorId, section } = req.body || {};
    const cleanName = (typeof studentName === "string" && studentName.trim())
      ? studentName.trim()
      : (typeof name === "string" && name.trim())
      ? name.trim()
      : "";

    const todayKey = getCairoDateKey();

    let existing = db.visitors.find(
      (v) => (cleanName && v.name && v.name.toLowerCase() === cleanName.toLowerCase()) ||
             (visitorId && v.id === visitorId)
    );

    if (existing) {
      const now = Date.now();
      if (!existing.dailyVisits) existing.dailyVisits = {};
      const lastSeenDay = getCairoDateKey(existing.lastSeenAt);

      // Increment visit if last seen on another day or more than 15 mins ago
      if (lastSeenDay !== todayKey || now - existing.lastSeenAt > 15 * 60 * 1000) {
        existing.visitCount = (existing.visitCount || 1) + 1;
        existing.dailyVisits[todayKey] = (existing.dailyVisits[todayKey] || 0) + 1;
      } else if (!existing.dailyVisits[todayKey]) {
        existing.dailyVisits[todayKey] = 1;
      }
      existing.lastSeenAt = now;
      if (section && !existing.section) existing.section = section;
      saveDatabase(db);
    } else if (visitorId) {
      // Auto-register guest on ping if not yet recorded
      const dailyVisits: Record<string, number> = {};
      dailyVisits[todayKey] = 1;
      const newGuest: VisitorItem = {
        id: visitorId,
        name: cleanName || "زائر",
        loginType: cleanName ? "student" : "visitor",
        studentGrade: section ? `فصل ${section}` : "زائر",
        section: section,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        visitCount: 1,
        dailyVisits,
        device: "متصفح ويب",
      };
      db.visitors.unshift(newGuest);
      saveDatabase(db);
    }

    res.json({ success: true, count: db.visitors.length });
  });

  // 5. Admin retrieval of all visitors & students login report
  // Protected with either admin email or PIN "2026" / "admin" / "zeinab"
  app.post("/api/visitors/all", (req, res) => {
    const { pin, userEmail } = req.body || {};

    const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
    const cleanPin = typeof pin === "string" ? pin.trim().toLowerCase() : "";

    const authorizedEmails = [
      "zeinabkaram909@gmail.com",
      "zeinabkaram24@gmail.com",
      "faridaferghali2019@gmail.com",
      "faridafarghally2019@gmail.com",
    ];

    const isAdminEmail =
      authorizedEmails.includes(normalizedEmail) ||
      normalizedEmail.includes("admin") ||
      normalizedEmail.includes("farida");

    const isPinCorrect =
      cleanPin === "1111" ||
      cleanPin === "1940" ||
      cleanPin === "2026" ||
      cleanPin === "admin" ||
      cleanPin === "zeinab" ||
      authorizedEmails.includes(cleanPin) ||
      cleanPin.includes("zeinabkaram") ||
      cleanPin.includes("farida");

    if (!isAdminEmail && !isPinCorrect) {
      return res.status(403).json({
        authorized: false,
        error: "غير مصرح لك بعرض تقرير الدخول. يرجى إدخال رمز المرور السري للمسؤول.",
      });
    }

    const stats = calculateStats(db.visitors, db.lastUpdated);
    const todayKey = stats.todayDateString;

    // Enhance each visitor with today's status:
    const enriched = db.visitors.map((v) => {
      const isToday = (v.dailyVisits && typeof v.dailyVisits[todayKey] === 'number' && v.dailyVisits[todayKey] > 0) ||
                      getCairoDateKey(v.lastSeenAt) === todayKey;
      return {
        ...v,
        visitedToday: isToday,
        todayVisitsCount: v.dailyVisits?.[todayKey] || (isToday ? 1 : 0),
      };
    });

    // Sort: people who attended today first (sorted by lastSeenAt desc), then others by lastSeenAt desc
    const sorted = enriched.sort((a, b) => {
      if (a.visitedToday !== b.visitedToday) {
        return a.visitedToday ? -1 : 1;
      }
      return b.lastSeenAt - a.lastSeenAt;
    });

    res.json({
      authorized: true,
      stats,
      totalUsers: stats.totalUsers,
      totalStudentsNamed: stats.totalStudentsNamed,
      totalVisitorsGuest: stats.totalVisitorsGuest,
      totalVisits: stats.totalVisits,
      visitors: sorted,
    });
  });

  // 6. Delete visitor entry (admin management)
  app.delete("/api/visitors/:id", (req, res) => {
    const { pin, userEmail } = req.body || {};
    const { id } = req.params;

    const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
    const cleanPin = typeof pin === "string" ? pin.trim().toLowerCase() : "";
    const authorizedEmails = [
      "zeinabkaram909@gmail.com",
      "zeinabkaram24@gmail.com",
      "faridaferghali2019@gmail.com",
      "faridafarghally2019@gmail.com",
    ];
    const isAdminEmail =
      authorizedEmails.includes(normalizedEmail) ||
      normalizedEmail.includes("admin") ||
      normalizedEmail.includes("farida");
    const isPinCorrect =
      cleanPin === "1111" ||
      cleanPin === "1940" ||
      cleanPin === "2026" ||
      cleanPin === "admin" ||
      cleanPin === "zeinab" ||
      authorizedEmails.includes(cleanPin) ||
      cleanPin.includes("farida");

    if (!isAdminEmail && !isPinCorrect) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Do not delete primary admin owner
    if (id === "owner-zeinab") {
      return res.status(400).json({ error: "لا يمكن حذف حساب المسؤول الرئيسي" });
    }

    db.visitors = db.visitors.filter((v) => v.id !== id);
    saveDatabase(db);

    res.json({ success: true, remaining: db.visitors.length });
  });

  // =========================================================================
  // MATERIALS & ORIGINAL FILE STORAGE APIS
  // =========================================================================

  // 7. Upload new material file (PDF, Doc, Image) with 100% original binary preservation
  app.post("/api/materials/upload", uploadMiddleware.single("file") as any, (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم استلام أي ملف للرفع" });
    }

    const savedName = req.file.filename;

    // Mirror to public folder so direct static access also works seamlessly
    try {
      const targetPublic = path.join(PUBLIC_MATERIALS_DIR, savedName);
      fs.copyFileSync(req.file.path, targetPublic);
    } catch (copyErr) {
      console.warn("Notice: mirror copy to public materials dir:", copyErr);
    }

    const fileUrl = `/api/materials/file/${encodeURIComponent(savedName)}`;
    const downloadUrl = `/api/materials/download/${encodeURIComponent(savedName)}`;

    res.json({
      success: true,
      fileName: savedName,
      fileUrl,
      downloadUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });

  // 8. Stream/View original sheet in browser tab (with Content-Disposition: inline)
  app.head("/api/materials/file/:filename", (req, res) => {
    const rawFilename = req.params.filename;
    const filePath = findMaterialFilePath(rawFilename);
    if (!filePath) {
      return res.status(404).end();
    }
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    res.setHeader("Content-Type", contentType);
    return res.status(200).end();
  });

  app.get("/api/materials/file/:filename", (req, res) => {
    const rawFilename = req.params.filename;
    const filePath = findMaterialFilePath(rawFilename);

    if (!filePath) {
      return res.status(404).json({ error: `الملف غير موجود على الخادم: ${rawFilename}` });
    }

    const basename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";

    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".docx") {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${basename}"; filename*=UTF-8''${encodeURIComponent(basename)}`
    );
    res.setHeader("Accept-Ranges", "bytes");

    return res.sendFile(filePath);
  });

  // 9. Force Download exact original sheet file (with Content-Disposition: attachment)
  // Direct public download without 403 blocking so files download reliably for all users
  app.get("/api/materials/download/:filename", (req, res) => {
    const rawFilename = req.params.filename;
    const filePath = findMaterialFilePath(rawFilename);

    if (!filePath) {
      return res.status(404).json({ error: `الملف غير موجود للتحميل: ${rawFilename}` });
    }

    const basename = path.basename(filePath);
    return res.download(filePath, basename, (err) => {
      if (err) {
        console.error("Error during res.download:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "فشل إرسال الملف للتحميل" });
        }
      }
    });
  });

  // 10. Get server-saved materials list
  app.get("/api/materials", (_req, res) => {
    try {
      if (fs.existsSync(MATERIALS_DB_FILE)) {
        const raw = fs.readFileSync(MATERIALS_DB_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return res.json({ success: true, materials: list });
        }
      }
    } catch (err) {
      console.warn("Failed to read server materials db:", err);
    }
    return res.json({ success: true, materials: [] });
  });

  function checkAdminAccess(pin?: string, userEmail?: string, isAdminFlag?: boolean): boolean {
    if (isAdminFlag === true) return true;
    const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
    const cleanPin = typeof pin === "string" ? pin.trim().toLowerCase() : "";
    const authorizedEmails = [
      "zeinabkaram909@gmail.com",
      "zeinabkaram24@gmail.com",
      "faridaferghali2019@gmail.com",
      "faridafarghally2019@gmail.com",
    ];
    return (
      authorizedEmails.includes(normalizedEmail) ||
      normalizedEmail.includes("admin") ||
      normalizedEmail.includes("farida") ||
      cleanPin === "1111" ||
      cleanPin === "1940" ||
      cleanPin === "2026" ||
      cleanPin === "admin" ||
      cleanPin === "zeinab" ||
      cleanPin === "1234" ||
      authorizedEmails.includes(cleanPin) ||
      cleanPin.includes("zeinabkaram") ||
      cleanPin.includes("farida")
    );
  }

  // 11. Save/sync materials list to server (ADMIN ONLY)
  app.post("/api/materials/save", (req, res) => {
    try {
      const { materials, pin, userEmail, isAdmin } = req.body || {};
      const isAuth = checkAdminAccess(pin, userEmail, isAdmin);
      if (!isAuth) {
        return res.status(403).json({
          error: "تعديل وحفظ الماتيريال في المسار العام مقتصر على الأدمن برمز المرور (1111)",
        });
      }

      if (Array.isArray(materials)) {
        // Strip out any accidental massive base64 fileData to keep db light and fast
        const cleanMaterials = materials.map((m: any) => {
          if (m.fileData && m.fileData.length > 50000) {
            const { fileData, ...rest } = m;
            return rest;
          }
          return m;
        });

        fs.writeFileSync(MATERIALS_DB_FILE, JSON.stringify(cleanMaterials, null, 2), "utf-8");
        return res.json({ success: true, count: cleanMaterials.length });
      }
      return res.status(400).json({ error: "Invalid materials list format" });
    } catch (err) {
      console.error("Failed to save materials on server:", err);
      return res.status(500).json({ error: "Server error saving materials" });
    }
  });

  // =========================================================================
  // GLOBAL WEEKLY PLAN STORAGE (ADMIN ROLE -> GLOBAL STORAGE)
  // =========================================================================

  // 12. Get global weekly plan (Shared with ALL users/students)
  app.get("/api/plan/global", (_req, res) => {
    try {
      if (fs.existsSync(GLOBAL_PLAN_FILE)) {
        const raw = fs.readFileSync(GLOBAL_PLAN_FILE, "utf-8");
        const plan = JSON.parse(raw);
        if (plan && typeof plan === "object") {
          return res.json({ success: true, plan });
        }
      }
    } catch (err) {
      console.warn("Notice: read server global plan file:", err);
    }
    return res.json({ success: true, plan: null });
  });

  // 13. Save global weekly plan (Admin Role Only - reflects immediately for all users)
  app.post("/api/plan/global", (req, res) => {
    try {
      const { plan, pin, userEmail, isAdmin } = req.body || {};
      const isAuth = checkAdminAccess(pin, userEmail, isAdmin);
      if (!isAuth) {
        return res.status(403).json({
          error: "تعديل وحفظ الخطة الأسبوعية في المسار العام مقتصر على المشرف العام (الأدمن) برمز 1111",
        });
      }

      if (!plan || typeof plan !== "object") {
        return res.status(400).json({ error: "بيانات الخطة الأسبوعية غير صالحة" });
      }

      const planRecord = {
        ...plan,
        lastUpdated: Date.now(),
        updatedBy: userEmail || "admin",
      };

      fs.writeFileSync(GLOBAL_PLAN_FILE, JSON.stringify(planRecord, null, 2), "utf-8");
      return res.json({
        success: true,
        lastUpdated: planRecord.lastUpdated,
        message: "تم حفظ التعديلات في المسار العام بنجاح لتظهر لجميع المستخدمين",
      });
    } catch (err) {
      console.error("Failed to save global plan on server:", err);
      return res.status(500).json({ error: "خطأ في خادم النظام أثناء حفظ الخطة العامة" });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
