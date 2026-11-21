// server.js - Logistics & B2B Quotation Management System
// Uses Node.js 24 built-in modules: http, node:sqlite, crypto, fs, path

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'logiquote.db');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Database
const db = new DatabaseSync(DB_FILE);

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer', -- 'admin' or 'customer'
      status TEXT NOT NULL DEFAULT 'approved', -- 'approved', 'pending'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '📦'
    );

    CREATE TABLE IF NOT EXISTS storage_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      description TEXT,
      image_url TEXT,
      unit_price REAL NOT NULL, -- Wholesale price visible in quotation
      cost_price REAL DEFAULT 0, -- Internal cost (admin only)
      carton_count INTEGER NOT NULL DEFAULT 0, -- "numbers of the cartoon"
      units_per_carton INTEGER NOT NULL DEFAULT 1, -- "items one by one"
      loose_units INTEGER NOT NULL DEFAULT 0,
      total_units INTEGER NOT NULL DEFAULT 0, -- total physical quantity (admin only)
      special_orientation TEXT DEFAULT 'Standard Upright ↑', -- Orientation & handling info
      warehouse_zone TEXT DEFAULT 'Main Warehouse',
      storage_location TEXT NOT NULL, -- "location of the storage area in their storage area"
      weight_per_unit_kg REAL DEFAULT 0.5,
      is_quotation_eligible INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      access_password TEXT NOT NULL, -- Password required by customer to view quotation
      status TEXT NOT NULL DEFAULT 'approved_sent', -- 'draft', 'approved_sent', 'accepted'
      valid_until DATE,
      notes TEXT,
      discount_percentage REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
      storage_item_id INTEGER REFERENCES storage_items(id),
      item_name TEXT NOT NULL,
      item_description TEXT,
      item_image_url TEXT,
      category_name TEXT,
      unit_price REAL NOT NULL,
      requested_quantity INTEGER NOT NULL DEFAULT 1,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quote_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES users(id),
      items_json TEXT NOT NULL,
      requested_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'converted', 'rejected'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaultData();
}

// Password hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_logiquote_salt').digest('hex');
}

// Seed initial data if empty
function seedDefaultData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Seeding initial system users...');
    const adminPass = hashPassword('admin123');
    const clientPass = hashPassword('client123');

    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, company_name, contact_name, phone, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('admin@logistics.com', adminPass, 'Apex Logistics & Wholesale Corp', 'Chief Logistics Officer', '+1 (555) 019-2834', 'admin', 'approved');
    insertUser.run('buyer@specialclient.com', clientPass, 'Global Retailers Ltd', 'Sarah Jenkins (VIP Wholesale)', '+1 (555) 782-9901', 'customer', 'approved');
    insertUser.run('david@merchants.com', clientPass, 'Metropolitan Hotel Supply', 'David Ross', '+1 (555) 431-8812', 'customer', 'approved');
  }

  const catCount = db.prepare('SELECT count(*) as count FROM categories').get().count;
  if (catCount === 0) {
    console.log('Seeding default categories...');
    const insertCat = db.prepare('INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)');
    insertCat.run('Glassware & Stemware', 'Premium crystal and tempered glassware for hospitality', '🍷');
    insertCat.run('Ceramics & Dinnerware', 'Commercial grade ceramic plates, bowls, and serving platters', '🍽️');
    insertCat.run('Kitchenware & Cutlery', 'Professional stainless steel kitchen essentials', '🔪');
    insertCat.run('Lighting & Decor', 'Commercial interior luminaires and luxury centerpieces', '💡');
    insertCat.run('Packaging & Storage', 'Industrial shipping containers and protective wrap', '📦');
  }

  const itemCount = db.prepare('SELECT count(*) as count FROM storage_items').get().count;
  if (itemCount === 0) {
    console.log('Seeding initial storage items with logistics details...');
    const insertItem = db.prepare(`
      INSERT INTO storage_items (
        sku, name, category_id, description, image_url,
        unit_price, cost_price, carton_count, units_per_carton, loose_units, total_units,
        special_orientation, warehouse_zone, storage_location, weight_per_unit_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleItems = [
      {
        sku: 'GLS-CRY-001',
        name: 'Royal Venetian Crystal Wine Glass (450ml)',
        category_id: 1,
        description: 'Lead-free Italian crystal stemware designed for full-bodied red wines. Laser-cut rim with elegant thin stem.',
        image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
        unit_price: 14.50,
        cost_price: 6.20,
        carton_count: 85,
        units_per_carton: 24,
        loose_units: 12,
        special_orientation: 'This Side Up ↑ (Fragile Stemware - Top Tier Only)',
        warehouse_zone: 'Zone A - Fragile Goods Vault',
        storage_location: 'Aisle 02, Rack 04, Shelf C, Bin A-14',
        weight: 0.28
      },
      {
        sku: 'GLS-TMP-002',
        name: 'Heavy Base Whiskey Tumbler (320ml)',
        category_id: 1,
        description: 'Tempered shock-resistant European bar tumbler with weighted base. Dishwasher safe for high-turnover bars.',
        image_url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80',
        unit_price: 8.75,
        cost_price: 3.40,
        carton_count: 140,
        units_per_carton: 36,
        loose_units: 0,
        special_orientation: 'Standard Upright ↑ (Max Stack: 5 Cartons)',
        warehouse_zone: 'Zone A - Fragile Goods Vault',
        storage_location: 'Aisle 02, Rack 05, Shelf B, Bin A-22',
        weight: 0.35
      },
      {
        sku: 'GLS-DEC-003',
        name: 'Artisan Glass Water Carafe & Pitcher (1.5L)',
        category_id: 1,
        description: 'Hand-blown thermal borosilicate glass carafe with brushed stainless steel dripless pouring spout.',
        image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
        unit_price: 22.00,
        cost_price: 9.80,
        carton_count: 45,
        units_per_carton: 12,
        loose_units: 6,
        special_orientation: 'Vertical Spout Up ↑ (Cushioned Bubble Packaging)',
        warehouse_zone: 'Zone A - Fragile Goods Vault',
        storage_location: 'Aisle 03, Rack 01, Shelf A, Bin A-03',
        weight: 0.72
      },
      {
        sku: 'CRM-PLT-101',
        name: 'Nordic Matte Charcoal Dinner Plate (28cm)',
        category_id: 2,
        description: 'Artisanal stoneware dinner plate with scratch-resistant matte glaze. Microwave, oven, and commercial dishwasher safe.',
        image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
        unit_price: 18.20,
        cost_price: 7.90,
        carton_count: 120,
        units_per_carton: 16,
        loose_units: 8,
        special_orientation: 'Flat Base Down ⬚ (Max 6 Cartons Interlocked)',
        warehouse_zone: 'Zone B - Heavy Ceramics Bay',
        storage_location: 'Aisle 05, Rack 08, Shelf 01, Heavy Bin B-10',
        weight: 0.95
      },
      {
        sku: 'CRM-BWL-102',
        name: 'Stone White Ramen & Grain Bowl (1000ml)',
        category_id: 2,
        description: 'Deep glazed porcelain bowl with tapered rim. Ideal for Asian cuisines, soups, and hearty grain salads.',
        image_url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80',
        unit_price: 13.90,
        cost_price: 5.50,
        carton_count: 90,
        units_per_carton: 20,
        loose_units: 4,
        special_orientation: 'Rim Facing Up ↑ (Keep Dry)',
        warehouse_zone: 'Zone B - Heavy Ceramics Bay',
        storage_location: 'Aisle 05, Rack 09, Shelf 02, Bin B-18',
        weight: 0.65
      },
      {
        sku: 'KTN-KNV-201',
        name: 'Damascus Steel Santoku Chef Knife (7-inch)',
        category_id: 3,
        description: '67-layer Japanese VG-10 core Damascus steel chef knife with ergonomic moisture-resistant G10 handle.',
        image_url: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=600&q=80',
        unit_price: 68.00,
        cost_price: 29.00,
        carton_count: 60,
        units_per_carton: 25,
        loose_units: 0,
        special_orientation: 'Blade Horizontal ⬌ (Anti-Corrosion Silica Pack)',
        warehouse_zone: 'Zone C - High Security Tools',
        storage_location: 'Aisle 07, Lock-Cage 02, Shelf 03, Bin C-04',
        weight: 0.32
      },
      {
        sku: 'KTN-PAN-202',
        name: 'Tri-Ply Stainless Steel Sauté Pan (30cm)',
        category_id: 3,
        description: 'Commercial induction-ready 3-ply clad stainless pan with riveted stay-cool handle and fitted lid.',
        image_url: 'https://images.unsplash.com/photo-1584990347449-39909249764d?auto=format&fit=crop&w=600&q=80',
        unit_price: 52.50,
        cost_price: 22.10,
        carton_count: 75,
        units_per_carton: 8,
        loose_units: 5,
        special_orientation: 'Handle Inward ↶ (Heavy Stack Base)',
        warehouse_zone: 'Zone C - Cookware Racks',
        storage_location: 'Aisle 08, Rack 03, Shelf 01, Bin C-29',
        weight: 2.10
      },
      {
        sku: 'LGT-LMP-301',
        name: 'Brushed Brass Rechargeable Cordless Table Lamp',
        category_id: 4,
        description: 'Minimalist touch-dimming cordless hospitality lamp. 4000mAh battery providing up to 24 hours warm ambient glow.',
        image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
        unit_price: 49.00,
        cost_price: 19.50,
        carton_count: 50,
        units_per_carton: 12,
        loose_units: 2,
        special_orientation: 'Electronics Upright ↑ (Contains Li-Ion Battery UN3481)',
        warehouse_zone: 'Zone D - Climate Controlled Tech',
        storage_location: 'Aisle 10, Rack 02, Shelf 04, Bin D-09',
        weight: 0.88
      }
    ];

    for (const item of sampleItems) {
      const totalUnits = (item.carton_count * item.units_per_carton) + item.loose_units;
      insertItem.run(
        item.sku, item.name, item.category_id, item.description, item.image_url,
        item.unit_price, item.cost_price, item.carton_count, item.units_per_carton,
        item.loose_units, totalUnits, item.special_orientation, item.warehouse_zone,
        item.storage_location, item.weight
      );
    }
  }

  // Seed sample quotation with password
  const quoteCount = db.prepare('SELECT count(*) as count FROM quotations').get().count;
  if (quoteCount === 0) {
    console.log('Seeding initial quotation for VIP client with password...');
    const quoteNum = 'QT-2026-VIP01';
    const accessPassword = 'QUOTE-VIP-2026';
    const subtotal = 14.50 * 50 + 8.75 * 100 + 18.20 * 60; // 725 + 875 + 1092 = 2692
    const discount = 10; // 10%
    const total = subtotal * 0.90;

    const insertQuote = db.prepare(`
      INSERT INTO quotations (
        quote_number, customer_id, title, access_password, status,
        valid_until, notes, discount_percentage, subtotal, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuote.run(
      quoteNum, 2, '2026 Q1 Hospitality Wholesale Catalog Quotation',
      accessPassword, 'approved_sent', '2026-12-31',
      'Exclusive VIP Wholesale rates for Global Retailers Ltd. Includes bulk purchase bonus discount. All items pre-inspected at Apex Logistics Hub.',
      discount, subtotal, total
    );

    const quoteId = 1;
    const insertQItem = db.prepare(`
      INSERT INTO quotation_items (
        quotation_id, storage_item_id, item_name, item_description,
        item_image_url, category_name, unit_price, requested_quantity, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQItem.run(
      quoteId, 1, 'Royal Venetian Crystal Wine Glass (450ml)',
      'Lead-free Italian crystal stemware designed for full-bodied red wines. Laser-cut rim with elegant thin stem.',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
      'Glassware & Stemware', 14.50, 50, 14.50 * 50
    );

    insertQItem.run(
      quoteId, 2, 'Heavy Base Whiskey Tumbler (320ml)',
      'Tempered shock-resistant European bar tumbler with weighted base. Dishwasher safe for high-turnover bars.',
      'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80',
      'Glassware & Stemware', 8.75, 100, 8.75 * 100
    );

    insertQItem.run(
      quoteId, 4, 'Nordic Matte Charcoal Dinner Plate (28cm)',
      'Artisanal stoneware dinner plate with scratch-resistant matte glaze. Microwave, oven, and commercial dishwasher safe.',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      'Ceramics & Dinnerware', 18.20, 60, 18.20 * 60
    );
  }
}

// In-memory active tokens
const activeSessions = new Map();

function generateToken(userId, role) {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, { userId, role, createdAt: Date.now() });
  return token;
}

function getSession(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    if (session) return session;
  }
  // Also check cookie if present
  const cookies = req.headers['cookie'];
  if (cookies) {
    const match = cookies.match(/logiquote_token=([a-f0-9]+)/);
    if (match && activeSessions.has(match[1])) {
      return activeSessions.get(match[1]);
    }
  }
  return null;
}

// Body parser utility
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 25 * 1024 * 1024) { // 25MB limit for high-res images
        reject(new Error('Body too large (maximum 25MB)'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) resolve({});
        else resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Security check to avoid directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routes
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404);
        res.end('File Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

// HTTP Server Handler
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  // API Router
  try {
    // -------------------------------------------------------------
    // AUTHENTICATION ROUTES
    // -------------------------------------------------------------
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await parseBody(req);
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required' });
      }

      const passHash = hashPassword(password);
      const user = db.prepare('SELECT id, email, company_name, contact_name, phone, role, status FROM users WHERE email = ? AND password_hash = ?').get(email.trim().toLowerCase(), passHash);

      if (!user) {
        return sendJson(res, 401, { error: 'Invalid email or password' });
      }

      if (user.status !== 'approved') {
        return sendJson(res, 403, { error: 'Your account is pending company approval. Please wait for authorization.' });
      }

      const token = generateToken(user.id, user.role);
      return sendJson(res, 200, {
        token,
        user: {
          id: user.id,
          email: user.email,
          company_name: user.company_name,
          contact_name: user.contact_name,
          phone: user.phone,
          role: user.role
        }
      });
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { email, password, company_name, contact_name, phone } = await parseBody(req);
      if (!email || !password || !company_name || !contact_name) {
        return sendJson(res, 400, { error: 'All fields (email, password, company name, contact name) are required' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
      if (existing) {
        return sendJson(res, 409, { error: 'An account with this email already exists' });
      }

      const passHash = hashPassword(password);
      const result = db.prepare(`
        INSERT INTO users (email, password_hash, company_name, contact_name, phone, role, status)
        VALUES (?, ?, ?, ?, ?, 'customer', 'approved')
      `).run(email.trim().toLowerCase(), passHash, company_name, contact_name, phone || '');

      const token = generateToken(result.lastInsertRowid, 'customer');
      return sendJson(res, 201, {
        token,
        user: {
          id: result.lastInsertRowid,
          email: email.trim().toLowerCase(),
          company_name,
          contact_name,
          phone: phone || '',
          role: 'customer'
        }
      });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

      const user = db.prepare('SELECT id, email, company_name, contact_name, phone, role, status FROM users WHERE id = ?').get(session.userId);
      if (!user) return sendJson(res, 401, { error: 'User not found' });

      return sendJson(res, 200, { user });
    }

    // -------------------------------------------------------------
    // CATEGORIES (PUBLIC / SHARED)
    // -------------------------------------------------------------
    if (pathname === '/api/categories' && req.method === 'GET') {
      const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
      return sendJson(res, 200, { categories });
    }

    if (pathname === '/api/categories' && req.method === 'POST') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const { name, description, icon } = await parseBody(req);
      if (!name) return sendJson(res, 400, { error: 'Category name is required' });

      try {
        const stmt = db.prepare('INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)');
        const result = stmt.run(name.trim(), description || '', icon || '📦');
        return sendJson(res, 201, { id: result.lastInsertRowid, name, description, icon: icon || '📦' });
      } catch (err) {
        return sendJson(res, 400, { error: 'Category already exists or invalid data' });
      }
    }

    // -------------------------------------------------------------
    // CUSTOMER-FACING QUOTATION CATALOG (STRICT PRIVACY ENFORCEMENT)
    // CRITICAL: ONLY returns Name, Description, Image, Price, Category!
    // NEVER returns carton counts, quantity in store, warehouse location, orientation!
    // -------------------------------------------------------------
    if (pathname === '/api/customer/catalog' && req.method === 'GET') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Must sign in to view wholesale quotation catalog' });

      const categoryFilter = urlObj.searchParams.get('category');
      const search = urlObj.searchParams.get('q');

      let query = `
        SELECT 
          s.id,
          s.sku,
          s.name,
          s.description,
          s.image_url,
          s.unit_price,
          c.id as category_id,
          c.name as category_name,
          c.icon as category_icon
        FROM storage_items s
        LEFT JOIN categories c ON s.category_id = c.id
        WHERE s.is_quotation_eligible = 1
      `;
      const params = [];

      if (categoryFilter && categoryFilter !== 'all') {
        query += ` AND s.category_id = ?`;
        params.push(categoryFilter);
      }
      if (search && search.trim() !== '') {
        query += ` AND (s.name LIKE ? OR s.description LIKE ? OR s.sku LIKE ?)`;
        const wildcard = `%${search.trim()}%`;
        params.push(wildcard, wildcard, wildcard);
      }

      query += ` ORDER BY c.name ASC, s.name ASC`;

      const items = db.prepare(query).all(...params);
      return sendJson(res, 200, { items });
    }

    // -------------------------------------------------------------
    // CUSTOMER QUOTATIONS (VIEW WITH PASSWORD OR AUTH)
    // -------------------------------------------------------------
    if (pathname === '/api/customer/quotations' && req.method === 'GET') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Must sign in' });

      // Return quotations addressed to this customer (metadata only, locked password indication)
      const quotes = db.prepare(`
        SELECT 
          id, quote_number, title, status, valid_until,
          discount_percentage, subtotal, total_amount, created_at,
          CASE WHEN access_password IS NOT NULL AND access_password != '' THEN 1 ELSE 0 END as is_password_protected
        FROM quotations
        WHERE customer_id = ? AND status IN ('approved_sent', 'accepted')
        ORDER BY created_at DESC
      `).all(session.userId);

      return sendJson(res, 200, { quotations: quotes });
    }

    // Unlock quotation with password & view items
    if (pathname.match(/^\/api\/customer\/quotations\/(\d+)\/unlock$/) && req.method === 'POST') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Must sign in' });

      const quoteId = pathname.split('/')[4];
      const { password } = await parseBody(req);

      const quote = db.prepare(`
        SELECT * FROM quotations WHERE id = ? AND (customer_id = ? OR ? = 'admin')
      `).get(quoteId, session.userId, session.role);

      if (!quote) return sendJson(res, 404, { error: 'Quotation not found or unauthorized' });

      // Check access password if quote has one
      if (quote.access_password && quote.access_password.trim() !== '') {
        if (!password || password.trim().toUpperCase() !== quote.access_password.trim().toUpperCase()) {
          return sendJson(res, 403, { error: 'Incorrect quotation password. Please ask your sales representative for the valid password.' });
        }
      }

      // Fetch quote items - STRICT: only item name, description, image, unit price, requested quantity, line total
      const items = db.prepare(`
        SELECT 
          id, storage_item_id, item_name, item_description,
          item_image_url, category_name, unit_price, requested_quantity, line_total
        FROM quotation_items
        WHERE quotation_id = ?
        ORDER BY id ASC
      `).all(quoteId);

      return sendJson(res, 200, {
        quotation: {
          id: quote.id,
          quote_number: quote.quote_number,
          title: quote.title,
          status: quote.status,
          valid_until: quote.valid_until,
          notes: quote.notes,
          discount_percentage: quote.discount_percentage,
          subtotal: quote.subtotal,
          total_amount: quote.total_amount,
          created_at: quote.created_at
        },
        items
      });
    }

    // Customer submit custom quote request
    if (pathname === '/api/customer/request-quote' && req.method === 'POST') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Must sign in to request quotation' });

      const { items, notes } = await parseBody(req);
      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendJson(res, 400, { error: 'Must provide at least one item in quote request' });
      }

      const stmt = db.prepare(`
        INSERT INTO quote_requests (customer_id, items_json, requested_notes, status)
        VALUES (?, ?, ?, 'pending')
      `);
      const result = stmt.run(session.userId, JSON.stringify(items), notes || '');

      return sendJson(res, 201, {
        success: true,
        requestId: result.lastInsertRowid,
        message: 'Your wholesale quotation request has been submitted to Apex Logistics sales team! We will review and provide a secured password-protected quotation soon.'
      });
    }

    // -------------------------------------------------------------
    // FILE / IMAGE UPLOAD ROUTES (FROM DESKTOP)
    // -------------------------------------------------------------
    if (pathname === '/api/upload' && req.method === 'POST') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required to upload pictures' });

      const { filename, data } = await parseBody(req);
      if (!data) return sendJson(res, 400, { error: 'No image data provided' });

      try {
        let ext = '.png';
        let base64Content = data;

        // Check if data is Data URL format: "data:image/jpeg;base64,...."
        const matches = data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches) {
          const mimeSub = matches[1].toLowerCase();
          if (mimeSub === 'jpeg' || mimeSub === 'jpg') ext = '.jpg';
          else if (mimeSub === 'png') ext = '.png';
          else if (mimeSub === 'webp') ext = '.webp';
          else if (mimeSub === 'gif') ext = '.gif';
          else ext = '.' + mimeSub;
          base64Content = matches[2];
        } else if (filename) {
          const parsedExt = path.extname(filename).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(parsedExt)) {
            ext = parsedExt;
          }
        }

        const buffer = Buffer.from(base64Content, 'base64');
        const uniqueFilename = `item_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
        const targetPath = path.join(UPLOADS_DIR, uniqueFilename);

        fs.writeFileSync(targetPath, buffer);

        const fileUrl = `/uploads/${uniqueFilename}`;
        return sendJson(res, 201, {
          success: true,
          url: fileUrl,
          filename: uniqueFilename,
          message: 'Picture successfully uploaded from desktop!'
        });
      } catch (uploadErr) {
        console.error('File upload error:', uploadErr);
        return sendJson(res, 500, { error: 'Failed to save uploaded image: ' + uploadErr.message });
      }
    }

    // Quick Update picture for an item directly
    if (pathname.match(/^\/api\/admin\/storage-items\/(\d+)\/picture$/) && req.method === 'PUT') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const itemId = pathname.split('/')[4];
      const { image_url } = await parseBody(req);

      if (!image_url) return sendJson(res, 400, { error: 'image_url is required' });

      db.prepare('UPDATE storage_items SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(image_url, itemId);
      db.prepare('UPDATE quotation_items SET item_image_url = ? WHERE storage_item_id = ?').run(image_url, itemId);

      return sendJson(res, 200, { success: true, image_url, message: 'Item picture updated successfully' });
    }

    // -------------------------------------------------------------
    // ADMIN / LOGISTICS MANAGEMENT ROUTES
    // -------------------------------------------------------------
    // Get all storage items with FULL logistics information (cartons, orientation, storage location)
    if (pathname === '/api/admin/storage-items' && req.method === 'GET') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const search = urlObj.searchParams.get('q');
      const category = urlObj.searchParams.get('category');
      const zone = urlObj.searchParams.get('zone');

      let query = `
        SELECT 
          s.*,
          c.name as category_name,
          c.icon as category_icon
        FROM storage_items s
        LEFT JOIN categories c ON s.category_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (category && category !== 'all') {
        query += ` AND s.category_id = ?`;
        params.push(category);
      }
      if (zone && zone !== 'all') {
        query += ` AND s.warehouse_zone = ?`;
        params.push(zone);
      }
      if (search && search.trim() !== '') {
        query += ` AND (s.name LIKE ? OR s.sku LIKE ? OR s.storage_location LIKE ? OR s.special_orientation LIKE ?)`;
        const wildcard = `%${search.trim()}%`;
        params.push(wildcard, wildcard, wildcard, wildcard);
      }

      query += ` ORDER BY s.id DESC`;

      const items = db.prepare(query).all(...params);

      // Compute summary stats
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_skus,
          COALESCE(SUM(carton_count), 0) as total_cartons,
          COALESCE(SUM(total_units), 0) as total_units_in_stock,
          COALESCE(SUM(total_units * unit_price), 0) as total_inventory_value
        FROM storage_items
      `).get();

      return sendJson(res, 200, { items, stats });
    }

    // Add new storage item
    if (pathname === '/api/admin/storage-items' && req.method === 'POST') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const body = await parseBody(req);
      const {
        sku, name, category_id, description, image_url,
        unit_price, cost_price, carton_count, units_per_carton, loose_units,
        special_orientation, warehouse_zone, storage_location, weight_per_unit_kg
      } = body;

      if (!sku || !name || !storage_location || unit_price === undefined) {
        return sendJson(res, 400, { error: 'SKU, Name, Storage Location, and Unit Price are required' });
      }

      const cartons = parseInt(carton_count || 0, 10);
      const unitsPerCarton = parseInt(units_per_carton || 1, 10);
      const loose = parseInt(loose_units || 0, 10);
      const totalUnits = (cartons * unitsPerCarton) + loose;

      try {
        const stmt = db.prepare(`
          INSERT INTO storage_items (
            sku, name, category_id, description, image_url,
            unit_price, cost_price, carton_count, units_per_carton, loose_units, total_units,
            special_orientation, warehouse_zone, storage_location, weight_per_unit_kg
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
          sku.trim().toUpperCase(),
          name.trim(),
          category_id || 1,
          description || '',
          image_url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
          parseFloat(unit_price) || 0,
          parseFloat(cost_price || 0),
          cartons,
          unitsPerCarton,
          loose,
          totalUnits,
          special_orientation || 'Standard Upright ↑',
          warehouse_zone || 'Main Warehouse',
          storage_location.trim(),
          parseFloat(weight_per_unit_kg || 0.5)
        );

        return sendJson(res, 201, { id: result.lastInsertRowid, message: 'Storage item added successfully' });
      } catch (err) {
        return sendJson(res, 400, { error: 'Failed to add item: SKU must be unique or data invalid' });
      }
    }

    // Update storage item
    if (pathname.match(/^\/api\/admin\/storage-items\/(\d+)$/) && req.method === 'PUT') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const itemId = pathname.split('/')[4];
      const body = await parseBody(req);
      const {
        sku, name, category_id, description, image_url,
        unit_price, cost_price, carton_count, units_per_carton, loose_units,
        special_orientation, warehouse_zone, storage_location, weight_per_unit_kg
      } = body;

      const cartons = parseInt(carton_count || 0, 10);
      const unitsPerCarton = parseInt(units_per_carton || 1, 10);
      const loose = parseInt(loose_units || 0, 10);
      const totalUnits = (cartons * unitsPerCarton) + loose;

      const stmt = db.prepare(`
        UPDATE storage_items SET
          sku = ?, name = ?, category_id = ?, description = ?, image_url = ?,
          unit_price = ?, cost_price = ?, carton_count = ?, units_per_carton = ?,
          loose_units = ?, total_units = ?, special_orientation = ?,
          warehouse_zone = ?, storage_location = ?, weight_per_unit_kg = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        sku.trim().toUpperCase(),
        name.trim(),
        category_id,
        description,
        image_url,
        parseFloat(unit_price),
        parseFloat(cost_price || 0),
        cartons,
        unitsPerCarton,
        loose,
        totalUnits,
        special_orientation,
        warehouse_zone,
        storage_location.trim(),
        parseFloat(weight_per_unit_kg || 0.5),
        itemId
      );

      return sendJson(res, 200, { success: true, message: 'Item updated successfully' });
    }

    // Delete storage item
    if (pathname.match(/^\/api\/admin\/storage-items\/(\d+)$/) && req.method === 'DELETE') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const itemId = pathname.split('/')[4];
      db.prepare('DELETE FROM storage_items WHERE id = ?').run(itemId);
      return sendJson(res, 200, { success: true, message: 'Item deleted' });
    }

    // -------------------------------------------------------------
    // ADMIN QUOTATION GENERATOR & MANAGEMENT
    // Automatically creates quotation from storage items!
    // -------------------------------------------------------------
    if (pathname === '/api/admin/quotations' && req.method === 'GET') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const quotations = db.prepare(`
        SELECT 
          q.*,
          u.company_name as customer_company,
          u.contact_name as customer_name,
          u.email as customer_email,
          (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as item_count
        FROM quotations q
        LEFT JOIN users u ON q.customer_id = u.id
        ORDER BY q.created_at DESC
      `).all();

      return sendJson(res, 200, { quotations });
    }

    // Auto-generate or custom-create quotation from storage items
    if (pathname === '/api/admin/quotations' && req.method === 'POST') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const body = await parseBody(req);
      const {
        customer_id,
        title,
        access_password,
        status, // 'draft' or 'approved_sent'
        valid_until,
        notes,
        discount_percentage,
        selected_item_ids, // array of storage item IDs, or empty to include all storage items!
        custom_quantities // optional map of itemId -> quantity
      } = body;

      if (!customer_id || !title) {
        return sendJson(res, 400, { error: 'Customer and Quotation Title are required' });
      }

      // Generate unique quote number
      const count = db.prepare('SELECT count(*) as count FROM quotations').get().count + 1;
      const quoteNumber = `QT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
      
      // Default secure password if none provided
      const password = access_password && access_password.trim() !== ''
        ? access_password.trim()
        : `QUOTE-${Math.floor(1000 + Math.random() * 9000)}`;

      // Fetch storage items to include in quotation
      let itemsToInclude = [];
      if (selected_item_ids && Array.isArray(selected_item_ids) && selected_item_ids.length > 0) {
        const placeholders = selected_item_ids.map(() => '?').join(',');
        itemsToInclude = db.prepare(`
          SELECT s.*, c.name as category_name
          FROM storage_items s
          LEFT JOIN categories c ON s.category_id = c.id
          WHERE s.id IN (${placeholders})
        `).all(...selected_item_ids);
      } else {
        // "Make the storage, all the storage items, automatically make it a quotation"
        itemsToInclude = db.prepare(`
          SELECT s.*, c.name as category_name
          FROM storage_items s
          LEFT JOIN categories c ON s.category_id = c.id
          WHERE s.is_quotation_eligible = 1
        `).all();
      }

      if (itemsToInclude.length === 0) {
        return sendJson(res, 400, { error: 'No storage items available to generate quotation' });
      }

      // Calculate totals
      let subtotal = 0;
      const quoteItemsData = itemsToInclude.map(item => {
        const qty = (custom_quantities && custom_quantities[item.id]) ? parseInt(custom_quantities[item.id], 10) : 1;
        const lineTotal = item.unit_price * qty;
        subtotal += lineTotal;
        return {
          storage_item_id: item.id,
          item_name: item.name,
          item_description: item.description,
          item_image_url: item.image_url,
          category_name: item.category_name,
          unit_price: item.unit_price,
          requested_quantity: qty,
          line_total: lineTotal
        };
      });

      const discount = parseFloat(discount_percentage || 0);
      const totalAmount = subtotal * (1 - (discount / 100));

      const quoteStmt = db.prepare(`
        INSERT INTO quotations (
          quote_number, customer_id, title, access_password, status,
          valid_until, notes, discount_percentage, subtotal, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const quoteResult = quoteStmt.run(
        quoteNumber,
        customer_id,
        title,
        password,
        status || 'approved_sent',
        valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes || 'Official wholesale quotation prepared directly from Apex Logistics catalog. Secure authorization code required to unlock.',
        discount,
        subtotal,
        totalAmount
      );

      const quoteId = quoteResult.lastInsertRowid;

      // Insert items into quotation_items
      const itemStmt = db.prepare(`
        INSERT INTO quotation_items (
          quotation_id, storage_item_id, item_name, item_description,
          item_image_url, category_name, unit_price, requested_quantity, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const qi of quoteItemsData) {
        itemStmt.run(
          quoteId,
          qi.storage_item_id,
          qi.item_name,
          qi.item_description,
          qi.item_image_url,
          qi.category_name,
          qi.unit_price,
          qi.requested_quantity,
          qi.line_total
        );
      }

      return sendJson(res, 201, {
        success: true,
        quotation_id: quoteId,
        quote_number: quoteNumber,
        access_password: password,
        item_count: quoteItemsData.length,
        total_amount: totalAmount,
        message: `Quotation ${quoteNumber} automatically created with ${quoteItemsData.length} items and password '${password}'!`
      });
    }

    // Admin view quotation detail
    if (pathname.match(/^\/api\/admin\/quotations\/(\d+)$/) && req.method === 'GET') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const quoteId = pathname.split('/')[4];
      const quote = db.prepare(`
        SELECT q.*, u.company_name as customer_company, u.contact_name as customer_name, u.email as customer_email, u.phone as customer_phone
        FROM quotations q
        LEFT JOIN users u ON q.customer_id = u.id
        WHERE q.id = ?
      `).get(quoteId);

      if (!quote) return sendJson(res, 404, { error: 'Quotation not found' });

      const items = db.prepare(`
        SELECT * FROM quotation_items WHERE quotation_id = ?
      `).all(quoteId);

      return sendJson(res, 200, { quotation: quote, items });
    }

    // Admin toggle / update quotation status (e.g. Agree to send quotation, change password)
    if (pathname.match(/^\/api\/admin\/quotations\/(\d+)\/status$/) && req.method === 'PUT') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const quoteId = pathname.split('/')[4];
      const { status, access_password } = await parseBody(req);

      let query = 'UPDATE quotations SET status = ?';
      const params = [status];

      if (access_password !== undefined && access_password.trim() !== '') {
        query += ', access_password = ?';
        params.push(access_password.trim());
      }
      query += ' WHERE id = ?';
      params.push(quoteId);

      db.prepare(query).run(...params);
      return sendJson(res, 200, { success: true, message: 'Quotation status updated' });
    }

    // Admin get list of customers
    if (pathname === '/api/admin/customers' && req.method === 'GET') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const customers = db.prepare(`
        SELECT id, email, company_name, contact_name, phone, status, created_at,
          (SELECT COUNT(*) FROM quotations WHERE customer_id = users.id) as quote_count
        FROM users
        WHERE role = 'customer'
        ORDER BY company_name ASC
      `).all();

      return sendJson(res, 200, { customers });
    }

    // Admin get customer quote requests
    if (pathname === '/api/admin/quote-requests' && req.method === 'GET') {
      const session = getSession(req);
      if (!session || session.role !== 'admin') return sendJson(res, 403, { error: 'Admin access required' });

      const requests = db.prepare(`
        SELECT qr.*, u.company_name, u.contact_name, u.email, u.phone
        FROM quote_requests qr
        JOIN users u ON qr.customer_id = u.id
        ORDER BY qr.created_at DESC
      `).all();

      return sendJson(res, 200, { requests });
    }

    // Fallback: static files
    serveStatic(req, res, pathname);

  } catch (error) {
    console.error('Server error:', error);
    sendJson(res, 500, { error: 'Internal server error: ' + error.message });
  }
});

// Initialize database and start listening
initDatabase();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`  LogiQuote Pro - Logistics & B2B Quotation Management System`);
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Admin Account:     admin@logistics.com / admin123`);
  console.log(`  VIP Client:        buyer@specialclient.com / client123`);
  console.log(`================================================================`);
});
