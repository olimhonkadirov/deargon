const express  = require('express');
const session  = require('express-session');
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const db       = require('./database');

const app  = express();
const PORT = process.env.PORT || 9944;

// ── Static & Body ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret: 'deargon-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));

// ── Multer (image upload) ────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'public', 'images', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Faqat rasm fayllari qabul qilinadi (jpg, png, webp, gif)'));
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAll(excludePassword = true) {
  const rows = excludePassword
    ? db.prepare("SELECT key, value FROM settings WHERE key != 'admin_password'").all()
    : db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

function requireAuth(req, res, next) {
  if (!req.session.isAdmin) return res.status(401).json({ error: 'Avtorizatsiya talab etiladi' });
  next();
}

// ── Public API ────────────────────────────────────────────────────────────────
app.get('/api/settings', (_req, res) => {
  res.json(getAll());
});

// ── Admin Auth ────────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  if (!row || !password || !bcrypt.compareSync(password, row.value))
    return res.status(401).json({ error: "Noto'g'ri parol" });
  req.session.isAdmin = true;
  res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/admin/check', (req, res) => {
  res.json({ loggedIn: !!req.session.isAdmin });
});

// ── Admin Settings ────────────────────────────────────────────────────────────
const EDITABLE = [
  'phone', 'whatsapp', 'telegram', 'telegram_main', 'instagram',
  'price', 'price_currency', 'price_old', 'price_discount',
  'countdown_end', 'uzum_url',
  'hero_title', 'hero_highlight', 'hero_subtitle',
  'site_title', 'delivery_text', 'contact_title', 'contact_subtitle', 'footer_copy',
  'youtube_url', 'hero_image_url', 'product_image_url',
  'gallery_image_1', 'gallery_image_2', 'gallery_image_3',
];

app.get('/api/admin/settings', requireAuth, (_req, res) => {
  res.json(getAll());
});

app.put('/api/admin/settings', requireAuth, (req, res) => {
  const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  for (const [key, value] of Object.entries(req.body)) {
    if (EDITABLE.includes(key)) stmt.run(String(value), key);
  }
  res.json({ success: true });
});

app.put('/api/admin/password', requireAuth, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
  db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'")
    .run(bcrypt.hashSync(newPassword, 10));
  res.json({ success: true });
});

// ── Admin Image Upload ────────────────────────────────────────────────────────
app.post('/api/admin/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Fayl tanlanmadi' });
    const url = '/images/uploads/' + req.file.filename;
    res.json({ success: true, url });
  });
});

// List uploaded images
app.get('/api/admin/uploads', requireAuth, (_req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => ({ name: f, url: '/images/uploads/' + f }))
      .reverse();
    res.json(files);
  } catch {
    res.json([]);
  }
});

// Delete uploaded image
app.delete('/api/admin/uploads/:filename', requireAuth, (req, res) => {
  const safe = path.basename(req.params.filename);
  const fp   = path.join(uploadDir, safe);
  try {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Faylni o'chirishda xato" });
  }
});

// ── Page Routes ───────────────────────────────────────────────────────────────
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅  Deargon server ishga tushdi → http://localhost:${PORT}`);
  console.log(`🔐  Admin panel         → http://localhost:${PORT}/admin`);
  console.log(`🔑  Default parol       → deargon2024\n`);
});
