const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path   = require('path');

const db = new DatabaseSync(path.join(__dirname, 'deargon.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )
`);

const defaults = {
  // Aloqa
  phone:             '+998948379944',
  whatsapp:          '998948379944',
  telegram:          '',
  telegram_main:     'https://t.me/deargonAdmin',
  instagram:         '',

  // Narx
  price:             '59 000',
  price_currency:    "so'm",

  // Hero matni
  hero_title:        "Shina teshildimi?",
  hero_highlight:    "Xavotir yo'q!",
  hero_subtitle:     "Deargon aerosoli shina teshigini muhrlaydi va bir vaqtning o'zida damlaydi — bor-yo'g'i bir necha daqiqada. G'ildirak almashtirish shart emas.",

  // Boshqa matnlar
  site_title:        'Deargon — Shina Tez Yamlash va Damlash',
  delivery_text:     "O'zbekiston bo'yicha yetkazib berish",
  contact_title:     "Buyurtma yoki savol bormi?",
  contact_subtitle:  "Telegram orqali yozing yoki qo'ng'iroq qiling — tez javob beramiz.",
  footer_copy:       '© 2024 Deargon. Barcha huquqlar himoyalangan.',

  // Media
  youtube_url:       '',
  hero_image_url:    '',
  product_image_url: '',

  // Galereya rasmlari
  gallery_image_1:   '',
  gallery_image_2:   '',
  gallery_image_3:   '',

  // Auth
  admin_password:    bcrypt.hashSync('deargon2024', 10),
};

const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaults)) {
  insert.run(key, value);
}

module.exports = db;
