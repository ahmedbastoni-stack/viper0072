// app.js - Full Dual-Engine Logic for The Viper Group
// Warehouse Logistics & B2B Wholesale Quotations Platform
// Operates seamlessly both with a Node.js backend AND standalone directly in any browser!

let currentUser = null;
let currentToken = null;
let currentTab = 'admin-inventory';
let categories = [];
let allStorageItems = [];
let cart = []; // Quote request cart items: [{ item, quantity }]
let selectedItemIdsForQuote = new Set();
let pendingUnlockQuoteId = null;
let pendingQuickUploadItemId = null;
let useLocalEngine = false;

// Uploaded images state for Add/Edit item modal (supports 4, 5+ pictures!)
let uploadedItemImages = [];

// Image Lightbox & Zoom Viewer state
let viewerCurrentItem = null;
let viewerCurrentIndex = 0;
let viewerCurrentZoom = 1.0;
let viewerPanX = 0;
let viewerPanY = 0;
let viewerIsDragging = false;
let viewerDragStartX = 0;
let viewerDragStartY = 0;

// ====================================================================
// DEFAULT DATA FOR THE VIPER GROUP (EACH ITEM HAS 5+ PICTURES)
// ====================================================================

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Glassware & Stemware', description: 'Premium crystal and tempered glassware for hospitality', icon: '🍷' },
  { id: 2, name: 'Ceramics & Dinnerware', description: 'Commercial grade ceramic plates, bowls, and platters', icon: '🍽️' },
  { id: 3, name: 'Kitchenware & Cutlery', description: 'Professional stainless steel kitchen essentials', icon: '🔪' },
  { id: 4, name: 'Lighting & Decor', description: 'Commercial interior luminaires and luxury centerpieces', icon: '💡' },
  { id: 5, name: 'Packaging & Storage', description: 'Industrial shipping containers and protective wrap', icon: '📦' }
];

const DEFAULT_STORAGE_ITEMS = [
  {
    id: 1,
    sku: 'GLS-CRY-001',
    name: 'Royal Venetian Crystal Wine Glass (450ml)',
    category_id: 1,
    category_name: 'Glassware & Stemware',
    category_icon: '🍷',
    description: 'Lead-free Italian crystal stemware designed for full-bodied red wines. Laser-cut rim with elegant thin stem.',
    image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508253578933-20b529302151?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 14.50,
    cost_price: 6.20,
    carton_count: 85,
    units_per_carton: 24,
    loose_units: 12,
    total_units: 2052,
    special_orientation: 'This Side Up ↑ (Fragile Stemware - Top Tier Only)',
    warehouse_zone: 'Zone A - Fragile Goods Vault',
    storage_location: 'Aisle 02, Rack 04, Shelf C, Bin A-14',
    weight_per_unit_kg: 0.28,
    is_quotation_eligible: 1
  },
  {
    id: 2,
    sku: 'GLS-TMP-002',
    name: 'Heavy Base Whiskey Tumbler (320ml)',
    category_id: 1,
    category_name: 'Glassware & Stemware',
    category_icon: '🍷',
    description: 'Tempered shock-resistant European bar tumbler with weighted base. Dishwasher safe for high-turnover bars.',
    image_url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508253578933-20b529302151?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 8.75,
    cost_price: 3.40,
    carton_count: 140,
    units_per_carton: 36,
    loose_units: 0,
    total_units: 5040,
    special_orientation: 'Standard Upright ↑ (Max Stack: 5 Cartons)',
    warehouse_zone: 'Zone A - Fragile Goods Vault',
    storage_location: 'Aisle 02, Rack 05, Shelf B, Bin A-22',
    weight_per_unit_kg: 0.35,
    is_quotation_eligible: 1
  },
  {
    id: 3,
    sku: 'GLS-DEC-003',
    name: 'Artisan Glass Water Carafe & Pitcher (1.5L)',
    category_id: 1,
    category_name: 'Glassware & Stemware',
    category_icon: '🍷',
    description: 'Hand-blown thermal borosilicate glass carafe with brushed stainless steel dripless pouring spout.',
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1550989460-0adc9554f529?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 22.00,
    cost_price: 9.80,
    carton_count: 45,
    units_per_carton: 12,
    loose_units: 6,
    total_units: 546,
    special_orientation: 'Vertical Spout Up ↑ (Cushioned Packaging)',
    warehouse_zone: 'Zone A - Fragile Goods Vault',
    storage_location: 'Aisle 03, Rack 01, Shelf A, Bin A-03',
    weight_per_unit_kg: 0.72,
    is_quotation_eligible: 1
  },
  {
    id: 4,
    sku: 'CRM-PLT-101',
    name: 'Nordic Matte Charcoal Dinner Plate (28cm)',
    category_id: 2,
    category_name: 'Ceramics & Dinnerware',
    category_icon: '🍽️',
    description: 'Artisanal stoneware dinner plate with scratch-resistant matte glaze. Microwave, oven, and commercial dishwasher safe.',
    image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 18.20,
    cost_price: 7.90,
    carton_count: 120,
    units_per_carton: 16,
    loose_units: 8,
    total_units: 1928,
    special_orientation: 'Flat Base Down ⬚ (Max 6 Cartons Interlocked)',
    warehouse_zone: 'Zone B - Heavy Ceramics Bay',
    storage_location: 'Aisle 05, Rack 08, Shelf 01, Heavy Bin B-10',
    weight_per_unit_kg: 0.95,
    is_quotation_eligible: 1
  },
  {
    id: 5,
    sku: 'CRM-BWL-102',
    name: 'Stone White Ramen & Grain Bowl (1000ml)',
    category_id: 2,
    category_name: 'Ceramics & Dinnerware',
    category_icon: '🍽️',
    description: 'Deep glazed porcelain bowl with tapered rim. Ideal for Asian cuisines, soups, and hearty grain salads.',
    image_url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 13.90,
    cost_price: 5.50,
    carton_count: 90,
    units_per_carton: 20,
    loose_units: 4,
    total_units: 1804,
    special_orientation: 'Rim Facing Up ↑ (Keep Dry / Moisture Proof)',
    warehouse_zone: 'Zone B - Heavy Ceramics Bay',
    storage_location: 'Aisle 05, Rack 09, Shelf 02, Bin B-18',
    weight_per_unit_kg: 0.65,
    is_quotation_eligible: 1
  },
  {
    id: 6,
    sku: 'KTN-KNV-201',
    name: 'Damascus Steel Santoku Chef Knife (7-inch)',
    category_id: 3,
    category_name: 'Kitchenware & Cutlery',
    category_icon: '🔪',
    description: '67-layer Japanese VG-10 core Damascus steel chef knife with ergonomic moisture-resistant G10 handle.',
    image_url: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1589792923962-537704632910?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1567361808960-dec9cb578182?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584990347449-39909249764d?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 68.00,
    cost_price: 29.00,
    carton_count: 60,
    units_per_carton: 25,
    loose_units: 0,
    total_units: 1500,
    special_orientation: 'Blade Horizontal ⬌ (Anti-Corrosion Sealed)',
    warehouse_zone: 'Zone C - High Security Tools',
    storage_location: 'Aisle 07, Lock-Cage 02, Shelf 03, Bin C-04',
    weight_per_unit_kg: 0.32,
    is_quotation_eligible: 1
  },
  {
    id: 7,
    sku: 'KTN-PAN-202',
    name: 'Tri-Ply Stainless Steel Sauté Pan (30cm)',
    category_id: 3,
    category_name: 'Kitchenware & Cutlery',
    category_icon: '🔪',
    description: 'Commercial induction-ready 3-ply clad stainless pan with riveted stay-cool handle and fitted lid.',
    image_url: 'https://images.unsplash.com/photo-1584990347449-39909249764d?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1584990347449-39909249764d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1567361808960-dec9cb578182?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 52.50,
    cost_price: 22.10,
    carton_count: 75,
    units_per_carton: 8,
    loose_units: 5,
    total_units: 605,
    special_orientation: 'Handle Inward ↶ (Heavy Stack Base)',
    warehouse_zone: 'Zone C - Cookware Racks',
    storage_location: 'Aisle 08, Rack 03, Shelf 01, Bin C-29',
    weight_per_unit_kg: 2.10,
    is_quotation_eligible: 1
  },
  {
    id: 8,
    sku: 'LGT-LMP-301',
    name: 'Brushed Brass Rechargeable Cordless Table Lamp',
    category_id: 4,
    category_name: 'Lighting & Decor',
    category_icon: '💡',
    description: 'Minimalist touch-dimming cordless hospitality lamp. 4000mAh battery providing up to 24 hours warm ambient glow.',
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80'
    ],
    unit_price: 49.00,
    cost_price: 19.50,
    carton_count: 50,
    units_per_carton: 12,
    loose_units: 2,
    total_units: 602,
    special_orientation: 'Electronics Upright ↑ (Contains Li-Ion Battery UN3481)',
    warehouse_zone: 'Zone D - Climate Controlled Tech',
    storage_location: 'Aisle 10, Rack 02, Shelf 04, Bin D-09',
    weight_per_unit_kg: 0.88,
    is_quotation_eligible: 1
  }
];

const DEFAULT_USERS = [
  { id: 1, email: 'admin@logistics.com', password: 'admin123', company_name: 'The Viper Group', contact_name: 'Chief Logistics Officer', phone: '+1 (555) 019-2834', role: 'admin', status: 'approved' },
  { id: 2, email: 'buyer@specialclient.com', password: 'client123', company_name: 'Global Retailers Ltd', contact_name: 'Sarah Jenkins (VIP Wholesale)', phone: '+1 (555) 782-9901', role: 'customer', status: 'approved' },
  { id: 3, email: 'david@merchants.com', password: 'client123', company_name: 'Metropolitan Hotel Supply', contact_name: 'David Ross', phone: '+1 (555) 431-8812', role: 'customer', status: 'approved' }
];

const DEFAULT_QUOTATIONS = [
  {
    id: 1,
    quote_number: 'QT-2026-VIP01',
    customer_id: 2,
    customer_company: 'Global Retailers Ltd',
    customer_name: 'Sarah Jenkins (VIP Wholesale)',
    customer_email: 'buyer@specialclient.com',
    title: '2026 Q1 Hospitality Wholesale Catalog Quotation',
    access_password: 'QUOTE-VIP-2026',
    status: 'approved_sent',
    valid_until: '2026-12-31',
    notes: 'Exclusive VIP Wholesale rates for Global Retailers Ltd. Prepared by The Viper Group commercial division. Pre-inspected at Dock 14.',
    discount_percentage: 10,
    subtotal: 2692.00,
    total_amount: 2422.80,
    created_at: '2026-01-15T10:00:00Z',
    items: [
      {
        id: 1,
        storage_item_id: 1,
        item_name: 'Royal Venetian Crystal Wine Glass (450ml)',
        item_description: 'Lead-free Italian crystal stemware designed for full-bodied red wines. Laser-cut rim with elegant thin stem.',
        item_image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
        category_name: 'Glassware & Stemware',
        unit_price: 14.50,
        requested_quantity: 50,
        line_total: 725.00
      },
      {
        id: 2,
        storage_item_id: 2,
        item_name: 'Heavy Base Whiskey Tumbler (320ml)',
        item_description: 'Tempered shock-resistant European bar tumbler with weighted base. Dishwasher safe for high-turnover bars.',
        item_image_url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80',
        category_name: 'Glassware & Stemware',
        unit_price: 8.75,
        requested_quantity: 100,
        line_total: 875.00
      },
      {
        id: 3,
        storage_item_id: 4,
        item_name: 'Nordic Matte Charcoal Dinner Plate (28cm)',
        item_description: 'Artisanal stoneware dinner plate with scratch-resistant matte glaze. Microwave, oven, and commercial dishwasher safe.',
        item_image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
        category_name: 'Ceramics & Dinnerware',
        unit_price: 18.20,
        requested_quantity: 60,
        line_total: 1092.00
      }
    ]
  }
];

class LocalDatabase {
  constructor() {
    this.init();
  }

  init() {
    // If not updated to v4_viper, re-seed with multi-pictures
    if (localStorage.getItem('viper_group_version') !== 'v4_viper') {
      localStorage.setItem('viper_group_version', 'v4_viper');
      localStorage.setItem('logiquote_categories', JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.setItem('logiquote_storage_items', JSON.stringify(DEFAULT_STORAGE_ITEMS));
      localStorage.setItem('logiquote_users', JSON.stringify(DEFAULT_USERS));
      localStorage.setItem('logiquote_quotations', JSON.stringify(DEFAULT_QUOTATIONS));
      localStorage.setItem('logiquote_requests', JSON.stringify([]));
    }
  }

  getCategories() {
    return JSON.parse(localStorage.getItem('logiquote_categories') || '[]');
  }

  getItems() {
    return JSON.parse(localStorage.getItem('logiquote_storage_items') || '[]');
  }

  saveItems(items) {
    localStorage.setItem('logiquote_storage_items', JSON.stringify(items));
  }

  getUsers() {
    return JSON.parse(localStorage.getItem('logiquote_users') || '[]');
  }

  saveUsers(users) {
    localStorage.setItem('logiquote_users', JSON.stringify(users));
  }

  getQuotations() {
    return JSON.parse(localStorage.getItem('logiquote_quotations') || '[]');
  }

  saveQuotations(quotes) {
    localStorage.setItem('logiquote_quotations', JSON.stringify(quotes));
  }

  getRequests() {
    return JSON.parse(localStorage.getItem('logiquote_requests') || '[]');
  }

  saveRequests(reqs) {
    localStorage.setItem('logiquote_requests', JSON.stringify(reqs));
  }

  // Handle local API endpoints
  handle(endpoint, method = 'GET', body = null) {
    const url = new URL(endpoint, 'http://localhost');
    const pathname = url.pathname;

    // Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = body;
      const user = this.getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
      if (!user) throw new Error('Invalid email or password');
      return { token: 'local_token_' + user.id, user };
    }

    // Register
    if (pathname === '/api/auth/register' && method === 'POST') {
      const users = this.getUsers();
      if (users.find(u => u.email.toLowerCase() === body.email.trim().toLowerCase())) {
        throw new Error('An account with this email already exists');
      }
      const newUser = {
        id: users.length + 1,
        email: body.email.trim().toLowerCase(),
        password: body.password,
        company_name: body.company_name,
        contact_name: body.contact_name,
        phone: body.phone || '',
        role: 'customer',
        status: 'approved'
      };
      users.push(newUser);
      this.saveUsers(users);
      return { token: 'local_token_' + newUser.id, user: newUser };
    }

    // Categories
    if (pathname === '/api/categories') {
      return { categories: this.getCategories() };
    }

    // Storage items (Admin)
    if (pathname === '/api/admin/storage-items' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const category = url.searchParams.get('category');
      const zone = url.searchParams.get('zone');

      let items = this.getItems();
      if (category && category !== 'all') {
        items = items.filter(i => String(i.category_id) === String(category));
      }
      if (zone && zone !== 'all') {
        items = items.filter(i => i.warehouse_zone === zone);
      }
      if (q) {
        items = items.filter(i => 
          i.name.toLowerCase().includes(q) || 
          i.sku.toLowerCase().includes(q) || 
          i.storage_location.toLowerCase().includes(q) ||
          i.special_orientation.toLowerCase().includes(q)
        );
      }

      const all = this.getItems();
      const stats = {
        total_skus: all.length,
        total_cartons: all.reduce((sum, i) => sum + (i.carton_count || 0), 0),
        total_units_in_stock: all.reduce((sum, i) => sum + (i.total_units || 0), 0),
        total_inventory_value: all.reduce((sum, i) => sum + ((i.total_units || 0) * (i.unit_price || 0)), 0)
      };

      return { items, stats };
    }

    // Add Storage Item (Admin) - Supports multiple pictures!
    if (pathname === '/api/admin/storage-items' && method === 'POST') {
      const items = this.getItems();
      const cat = this.getCategories().find(c => c.id === body.category_id);
      const cartons = parseInt(body.carton_count || 0, 10);
      const perCarton = parseInt(body.units_per_carton || 1, 10);
      const loose = parseInt(body.loose_units || 0, 10);
      const total = (cartons * perCarton) + loose;

      const imgList = (body.images && Array.isArray(body.images) && body.images.length > 0)
        ? body.images
        : [body.image_url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80'];

      const newItem = {
        id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1,
        sku: body.sku.trim().toUpperCase(),
        name: body.name.trim(),
        category_id: body.category_id,
        category_name: cat ? cat.name : 'General',
        category_icon: cat ? cat.icon : '📦',
        description: body.description || '',
        image_url: imgList[0],
        images: imgList,
        unit_price: parseFloat(body.unit_price) || 0,
        cost_price: parseFloat(body.cost_price || 0),
        carton_count: cartons,
        units_per_carton: perCarton,
        loose_units: loose,
        total_units: total,
        special_orientation: body.special_orientation || 'Standard Upright ↑',
        warehouse_zone: body.warehouse_zone || 'Zone A - Fragile Goods Vault',
        storage_location: body.storage_location.trim(),
        weight_per_unit_kg: parseFloat(body.weight_per_unit_kg || 0.5),
        is_quotation_eligible: 1
      };

      items.unshift(newItem);
      this.saveItems(items);
      return { id: newItem.id, message: 'Storage item added successfully' };
    }

    // Update Storage Item (Admin)
    if (pathname.match(/^\/api\/admin\/storage-items\/(\d+)$/) && method === 'PUT') {
      const id = parseInt(pathname.split('/')[4], 10);
      const items = this.getItems();
      const index = items.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Item not found');

      const cat = this.getCategories().find(c => c.id === body.category_id);
      const cartons = parseInt(body.carton_count || 0, 10);
      const perCarton = parseInt(body.units_per_carton || 1, 10);
      const loose = parseInt(body.loose_units || 0, 10);
      const total = (cartons * perCarton) + loose;

      const imgList = (body.images && Array.isArray(body.images) && body.images.length > 0)
        ? body.images
        : (body.image_url ? [body.image_url] : items[index].images);

      items[index] = {
        ...items[index],
        sku: body.sku.trim().toUpperCase(),
        name: body.name.trim(),
        category_id: body.category_id,
        category_name: cat ? cat.name : items[index].category_name,
        category_icon: cat ? cat.icon : items[index].category_icon,
        description: body.description || '',
        image_url: imgList[0],
        images: imgList,
        unit_price: parseFloat(body.unit_price) || 0,
        cost_price: parseFloat(body.cost_price || 0),
        carton_count: cartons,
        units_per_carton: perCarton,
        loose_units: loose,
        total_units: total,
        special_orientation: body.special_orientation,
        warehouse_zone: body.warehouse_zone,
        storage_location: body.storage_location.trim()
      };

      this.saveItems(items);
      return { success: true, message: 'Item updated successfully' };
    }

    // Quick Update Picture
    if (pathname.match(/^\/api\/admin\/storage-items\/(\d+)\/picture$/) && method === 'PUT') {
      const id = parseInt(pathname.split('/')[4], 10);
      const items = this.getItems();
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Item not found');

      item.image_url = body.image_url;
      if (!item.images) item.images = [body.image_url];
      else if (!item.images.includes(body.image_url)) item.images.unshift(body.image_url);

      this.saveItems(items);

      // Also update any quotations containing this item
      const quotes = this.getQuotations();
      quotes.forEach(q => {
        if (q.items) {
          q.items.forEach(qi => {
            if (qi.storage_item_id === id) qi.item_image_url = body.image_url;
          });
        }
      });
      this.saveQuotations(quotes);

      return { success: true, image_url: body.image_url, message: 'Picture updated successfully' };
    }

    // Delete Storage Item
    if (pathname.match(/^\/api\/admin\/storage-items\/(\d+)$/) && method === 'DELETE') {
      const id = parseInt(pathname.split('/')[4], 10);
      let items = this.getItems().filter(i => i.id !== id);
      this.saveItems(items);
      return { success: true, message: 'Item deleted' };
    }

    // ====================================================================
    // STRICT CUSTOMER PRIVACY: NEVER LEAKS STOCK COUNTS OR LOCATIONS!
    // ====================================================================
    if (pathname === '/api/customer/catalog') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const category = url.searchParams.get('category');

      let items = this.getItems().filter(i => i.is_quotation_eligible);
      if (category && category !== 'all') {
        items = items.filter(i => String(i.category_id) === String(category));
      }
      if (q) {
        items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
      }

      // STRICT: ONLY Pictures, Name, Category, Description, and Wholesale Price!
      const customerSafeItems = items.map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        category_id: i.category_id,
        category_name: i.category_name,
        category_icon: i.category_icon,
        description: i.description,
        image_url: i.image_url,
        images: (i.images && i.images.length > 0) ? i.images : [i.image_url], // all pictures for the customer to zoom!
        unit_price: i.unit_price
      }));

      return { items: customerSafeItems };
    }

    // Customer Quotations List
    if (pathname === '/api/customer/quotations') {
      const userId = currentUser ? currentUser.id : 2;
      const quotes = this.getQuotations().filter(q => q.customer_id === userId && q.status === 'approved_sent');
      return {
        quotations: quotes.map(q => ({
          id: q.id,
          quote_number: q.quote_number,
          title: q.title,
          status: q.status,
          valid_until: q.valid_until,
          discount_percentage: q.discount_percentage,
          subtotal: q.subtotal,
          total_amount: q.total_amount,
          created_at: q.created_at,
          is_password_protected: !!(q.access_password && q.access_password.trim() !== '')
        }))
      };
    }

    // Unlock Quotation with Password
    if (pathname.match(/^\/api\/customer\/quotations\/(\d+)\/unlock$/) && method === 'POST') {
      const id = parseInt(pathname.split('/')[4], 10);
      const quote = this.getQuotations().find(q => q.id === id);
      if (!quote) throw new Error('Quotation not found');

      if (quote.access_password && quote.access_password.trim() !== '') {
        if (!body.password || body.password.trim().toUpperCase() !== quote.access_password.trim().toUpperCase()) {
          throw new Error('Incorrect quotation password. Please ask your sales representative for the valid password.');
        }
      }

      // Return quotation items (strictly safe)
      return {
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
          created_at: quote.created_at,
          customer_company: quote.customer_company,
          contact_name: quote.customer_name,
          email: quote.customer_email
        },
        items: quote.items || []
      };
    }

    // Create / Auto-Generate Quotation from Storage Items
    if (pathname === '/api/admin/quotations' && method === 'POST') {
      const quotes = this.getQuotations();
      const allItems = this.getItems();
      const user = this.getUsers().find(u => u.id === body.customer_id) || this.getUsers()[1];

      let selectedItems = [];
      if (body.selected_item_ids && body.selected_item_ids.length > 0) {
        selectedItems = allItems.filter(i => body.selected_item_ids.includes(i.id));
      } else {
        selectedItems = allItems.filter(i => i.is_quotation_eligible);
      }

      if (selectedItems.length === 0) throw new Error('No items selected for quotation');

      let subtotal = 0;
      const quoteItems = selectedItems.map((item, idx) => {
        const qty = 1;
        const lineTotal = item.unit_price * qty;
        subtotal += lineTotal;
        return {
          id: idx + 1,
          storage_item_id: item.id,
          item_name: item.name,
          item_description: item.description,
          item_image_url: item.image_url,
          images: item.images || [item.image_url],
          category_name: item.category_name,
          unit_price: item.unit_price,
          requested_quantity: qty,
          line_total: lineTotal
        };
      });

      const discount = parseFloat(body.discount_percentage || 0);
      const totalAmount = subtotal * (1 - (discount / 100));
      const quoteNumber = `QT-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(4, '0')}`;
      const password = body.access_password || `QUOTE-${Math.floor(1000 + Math.random() * 9000)}`;

      const newQuote = {
        id: quotes.length > 0 ? Math.max(...quotes.map(q => q.id)) + 1 : 1,
        quote_number: quoteNumber,
        customer_id: user.id,
        customer_company: user.company_name,
        customer_name: user.contact_name,
        customer_email: user.email,
        title: body.title,
        access_password: password,
        status: body.status || 'approved_sent',
        valid_until: body.valid_until || '2026-12-31',
        notes: body.notes || 'Official wholesale quotation prepared directly by The Viper Group.',
        discount_percentage: discount,
        subtotal,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        items: quoteItems
      };

      quotes.unshift(newQuote);
      this.saveQuotations(quotes);

      return {
        success: true,
        quotation_id: newQuote.id,
        quote_number: quoteNumber,
        access_password: password,
        item_count: quoteItems.length,
        total_amount: totalAmount,
        message: `Quotation ${quoteNumber} automatically created with ${quoteItems.length} items and password '${password}'!`
      };
    }

    // Admin Quotations List
    if (pathname === '/api/admin/quotations' && method === 'GET') {
      const quotes = this.getQuotations();
      return {
        quotations: quotes.map(q => ({
          ...q,
          item_count: (q.items || []).length
        }))
      };
    }

    // Admin Single Quotation Detail
    if (pathname.match(/^\/api\/admin\/quotations\/(\d+)$/) && method === 'GET') {
      const id = parseInt(pathname.split('/')[4], 10);
      const quote = this.getQuotations().find(q => q.id === id);
      if (!quote) throw new Error('Quotation not found');
      return { quotation: quote, items: quote.items || [] };
    }

    // Update Quotation Status
    if (pathname.match(/^\/api\/admin\/quotations\/(\d+)\/status$/) && method === 'PUT') {
      const id = parseInt(pathname.split('/')[4], 10);
      const quotes = this.getQuotations();
      const quote = quotes.find(q => q.id === id);
      if (!quote) throw new Error('Quotation not found');
      quote.status = body.status;
      if (body.access_password) quote.access_password = body.access_password;
      this.saveQuotations(quotes);
      return { success: true, message: 'Quotation status updated' };
    }

    // Customers List
    if (pathname === '/api/admin/customers') {
      const quotes = this.getQuotations();
      const customers = this.getUsers().filter(u => u.role === 'customer').map(c => ({
        ...c,
        quote_count: quotes.filter(q => q.customer_id === c.id).length
      }));
      return { customers };
    }

    // Customer Submit Quote Request
    if (pathname === '/api/customer/request-quote' && method === 'POST') {
      const reqs = this.getRequests();
      const newReq = {
        id: reqs.length + 1,
        customer_id: currentUser ? currentUser.id : 2,
        company_name: currentUser ? currentUser.company_name : 'Global Retailers Ltd',
        contact_name: currentUser ? currentUser.contact_name : 'Sarah Jenkins',
        email: currentUser ? currentUser.email : 'buyer@specialclient.com',
        phone: currentUser ? currentUser.phone : '+1 (555) 782-9901',
        items_json: JSON.stringify(body.items || []),
        requested_notes: body.notes || '',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      reqs.unshift(newReq);
      this.saveRequests(reqs);
      return {
        success: true,
        requestId: newReq.id,
        message: 'Your wholesale quotation request has been submitted to The Viper Group sales team! We will review and provide a secured password-protected quotation soon.'
      };
    }

    // Admin Quote Requests
    if (pathname === '/api/admin/quote-requests') {
      return { requests: this.getRequests() };
    }

    // Direct Image Upload
    if (pathname === '/api/upload' && method === 'POST') {
      return {
        success: true,
        url: body.data,
        filename: body.filename || 'uploaded_image.png',
        message: 'Picture successfully uploaded from desktop!'
      };
    }

    throw new Error('Unknown endpoint: ' + pathname);
  }
}

const localDb = new LocalDatabase();

// Universal API Caller: Tries server first, smoothly falls back to Embedded Local Engine
async function apiCall(endpoint, method = 'GET', body = null) {
  if (useLocalEngine || window.location.protocol === 'file:') {
    useLocalEngine = true;
    return localDb.handle(endpoint, method, body);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(endpoint, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (err) {
    console.warn(`Server unreachable on ${endpoint}. Seamlessly switching to Embedded Local Engine.`);
    useLocalEngine = true;
    return localDb.handle(endpoint, method, body);
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Format Currency
function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  // Default to Admin login for instant testing
  await switchUserPersona('admin');
});

// Setup All DOM Event Listeners
function setupEventListeners() {
  // Persona Switcher buttons
  document.getElementById('btnSwitchAdmin').addEventListener('click', () => switchUserPersona('admin'));
  document.getElementById('btnSwitchCustomer').addEventListener('click', () => switchUserPersona('customer'));

  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
      const tabId = e.currentTarget.dataset.tab;
      setActiveTab(tabId);
    });
  });

  // Modal Closers
  document.querySelectorAll('.modal-close, [data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.close || e.currentTarget.closest('.modal-overlay').id;
      closeModal(modalId);
    });
  });

  // Admin Search & Filters
  document.getElementById('adminSearchInput').addEventListener('input', debounce(loadAdminStorageItems, 300));
  document.getElementById('adminCategoryFilter').addEventListener('change', loadAdminStorageItems);
  document.getElementById('adminZoneFilter').addEventListener('change', loadAdminStorageItems);

  // Customer Search & Filters
  document.getElementById('customerSearchInput').addEventListener('input', debounce(loadCustomerCatalog, 300));
  document.getElementById('customerCategoryFilter').addEventListener('change', loadCustomerCatalog);

  // Add Item Modal
  document.getElementById('btnOpenAddItemModal').addEventListener('click', () => {
    resetItemForm();
    openModal('itemModal');
  });

  // Carton Count & Units Calculator
  const cartonInput = document.getElementById('itemCartonCount');
  const unitsPerCartonInput = document.getElementById('itemUnitsPerCarton');
  const looseInput = document.getElementById('itemLooseUnits');
  const updateCalc = () => {
    const c = parseInt(cartonInput.value || 0, 10);
    const u = parseInt(unitsPerCartonInput.value || 0, 10);
    const l = parseInt(looseInput.value || 0, 10);
    const total = (c * u) + l;
    document.getElementById('calcTotalUnitsDisplay').textContent = `${total} units (${c} cartons × ${u}/carton + ${l} loose)`;
  };
  cartonInput.addEventListener('input', updateCalc);
  unitsPerCartonInput.addEventListener('input', updateCalc);
  looseInput.addEventListener('input', updateCalc);

  // Storage Item Form Submit
  document.getElementById('itemForm').addEventListener('submit', handleSaveStorageItem);

  // Auto-generate master quote from all items
  document.getElementById('btnAutoGenerateMasterQuote').addEventListener('click', () => {
    openGenerateQuoteModal(true); // true = include all items
  });

  // Custom quote modal
  document.getElementById('btnCreateNewQuote').addEventListener('click', () => {
    openGenerateQuoteModal(false);
  });

  // Generate random password button in quote modal
  document.getElementById('btnGeneratePassword').addEventListener('click', () => {
    const code = 'QUOTE-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('quoteAccessPassword').value = code;
  });

  // Quote Generation Form Submit
  document.getElementById('quoteGenerateForm').addEventListener('submit', handleCreateQuotation);

  // Unlock Quotation Password Submit
  document.getElementById('btnSubmitUnlockPassword').addEventListener('click', handleUnlockQuotation);
  document.getElementById('quoteUnlockInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUnlockQuotation();
  });

  // Print Quotation
  document.getElementById('btnPrintQuotation').addEventListener('click', () => {
    window.print();
  });

  // Select all items checkbox
  document.getElementById('selectAllItemsCheckbox').addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.item-select-checkbox').forEach(cb => {
      cb.checked = checked;
      const itemId = parseInt(cb.dataset.id, 10);
      if (checked) selectedItemIdsForQuote.add(itemId);
      else selectedItemIdsForQuote.delete(itemId);
    });
  });

  // Cart actions
  document.getElementById('btnGoToCart').addEventListener('click', () => setActiveTab('customer-cart'));
  document.getElementById('btnBrowseCatalog').addEventListener('click', () => setActiveTab('customer-catalog'));
  document.getElementById('btnSubmitQuoteRequest').addEventListener('click', handleSubmitQuoteRequest);

  // Auth Modal
  document.getElementById('btnTabLogin').addEventListener('click', () => {
    document.getElementById('btnTabLogin').classList.add('active');
    document.getElementById('btnTabRegister').classList.remove('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  });

  document.getElementById('btnTabRegister').addEventListener('click', () => {
    document.getElementById('btnTabRegister').classList.add('active');
    document.getElementById('btnTabLogin').classList.remove('active');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
  });

  document.getElementById('loginForm').addEventListener('submit', handleManualLogin);
  document.getElementById('registerForm').addEventListener('submit', handleManualRegister);

  // About Widget bottom-left listeners
  const btnToggleAbout = document.getElementById('btnToggleAbout');
  const btnCloseAbout = document.getElementById('btnCloseAbout');
  const aboutPopover = document.getElementById('aboutPopover');
  if (btnToggleAbout && aboutPopover) {
    btnToggleAbout.addEventListener('click', () => {
      aboutPopover.classList.toggle('hidden');
    });
  }
  if (btnCloseAbout && aboutPopover) {
    btnCloseAbout.addEventListener('click', () => {
      aboutPopover.classList.add('hidden');
    });
  }

  // Setup Image Upload and Viewer
  setupImageUploadEvents();
  setupImageViewerEvents();
}

// ====================================================================
// MULTI-IMAGE DESKTOP UPLOADS (ALLOWS 4, 5+ PICTURES PER ITEM)
// ====================================================================
function setupImageUploadEvents() {
  const dropzone = document.getElementById('imageDropzone');
  const fileInput = document.getElementById('itemFileInput');
  const btnBrowse = document.getElementById('btnBrowseFile');
  const btnToggleUrl = document.getElementById('btnToggleUrlInput');
  const urlContainer = document.getElementById('urlInputContainer');
  const urlInput = document.getElementById('itemImageUrlInput');
  const btnAddUrl = document.getElementById('btnAddUrlImage');

  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag & drop handlers
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleBatchUpload(files);
    }
  });

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleBatchUpload(e.target.files);
    }
  });

  // Toggle URL input fallback
  btnToggleUrl.addEventListener('click', () => {
    urlContainer.classList.toggle('hidden');
  });

  btnAddUrl.addEventListener('click', () => {
    const val = urlInput.value.trim();
    if (val) {
      uploadedItemImages.push(val);
      urlInput.value = '';
      renderUploadedGallery();
      showToast('Picture added via URL', 'info');
    }
  });

  // Quick Table Thumbnail File Input listener
  const quickFileInput = document.getElementById('quickTableFileInput');
  quickFileInput.addEventListener('change', handleQuickTableFileUpload);
}

// Handle multi-file selection from desktop
async function handleBatchUpload(files) {
  showToast(`Uploading ${files.length} picture(s) from your desktop...`, 'info');
  let count = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith('image/')) {
      try {
        const { url, previewUrl } = await uploadImageFile(file);
        uploadedItemImages.push(url || previewUrl);
        count++;
      } catch (err) {
        console.error('File upload error:', err);
      }
    }
  }
  renderUploadedGallery();
  showToast(`Added ${count} picture(s) from desktop! Total pictures: ${uploadedItemImages.length}`, 'success');
}

// Render multi-picture thumbnails in modal
function renderUploadedGallery() {
  const container = document.getElementById('uploadedGalleryGrid');
  const countBadge = document.getElementById('itemPicturesCountBadge');
  countBadge.textContent = `${uploadedItemImages.length} Picture(s) Added`;

  if (uploadedItemImages.length === 0) {
    container.innerHTML = '<p style="grid-column: 1 / -1; font-size: 12px; color: #94a3b8; text-align: center; padding: 12px;">No pictures uploaded yet. You can upload 4, 5, or more pictures for this item.</p>';
    return;
  }

  container.innerHTML = uploadedItemImages.map((imgSrc, idx) => `
    <div class="uploaded-thumb-card">
      <img src="${imgSrc}" alt="Item Photo ${idx + 1}">
      ${idx === 0 ? '<span class="thumb-badge-primary">★ Main Photo</span>' : `<span class="thumb-badge-primary">#${idx + 1}</span>`}
      <button type="button" class="thumb-remove-btn" onclick="removeUploadedPicture(${idx})" title="Remove this photo">&times;</button>
    </div>
  `).join('');
}

function removeUploadedPicture(index) {
  uploadedItemImages.splice(index, 1);
  renderUploadedGallery();
}

function resetModalDropzone() {
  uploadedItemImages = [];
  renderUploadedGallery();
  document.getElementById('itemFileInput').value = '';
  document.getElementById('itemImageUrlInput').value = '';
}

// Read file as Base64 Data URL
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Client-side image optimization (downscales large photos to clean web standard)
function optimizeImage(dataUrl, maxDimension = 1400) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= maxDimension && height <= maxDimension) {
        return resolve(dataUrl);
      }

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Upload image file
async function uploadImageFile(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (.png, .jpg, .jpeg, .webp, .gif)');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const optimizedDataUrl = await optimizeImage(rawDataUrl, 1600);

  const res = await apiCall('/api/upload', 'POST', {
    filename: file.name,
    data: optimizedDataUrl
  });

  return { url: res.url || optimizedDataUrl, filename: file.name, previewUrl: optimizedDataUrl };
}

// Quick 1-click upload from storage table
function triggerQuickUpload(itemId) {
  pendingQuickUploadItemId = itemId;
  const input = document.getElementById('quickTableFileInput');
  input.value = '';
  input.click();
}

async function handleQuickTableFileUpload(e) {
  if (!e.target.files || e.target.files.length === 0 || !pendingQuickUploadItemId) return;
  const file = e.target.files[0];
  const item = allStorageItems.find(i => i.id === pendingQuickUploadItemId);
  const itemName = item ? item.name : 'Storage Item';

  try {
    showToast(`Uploading picture for "${itemName}" from desktop...`, 'info');
    const { url, previewUrl } = await uploadImageFile(file);
    const newImg = url || previewUrl;
    
    // Add to item's images list or update main picture
    if (!item.images) item.images = [item.image_url];
    item.images.unshift(newImg);
    item.image_url = newImg;

    // Update in database / localStorage
    await apiCall(`/api/admin/storage-items/${pendingQuickUploadItemId}/picture`, 'PUT', { image_url: newImg, images: item.images });
    
    showToast(`New picture added to "${itemName}" from desktop!`, 'success');
    loadAdminStorageItems();
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error');
  } finally {
    pendingQuickUploadItemId = null;
  }
}

// ====================================================================
// INTERACTIVE ITEM PICTURE LIGHTBOX & ZOOM VIEWER
// ====================================================================
function setupImageViewerEvents() {
  document.getElementById('btnZoomIn').addEventListener('click', zoomIn);
  document.getElementById('btnZoomOut').addEventListener('click', zoomOut);
  document.getElementById('btnZoomReset').addEventListener('click', resetZoom);
  document.getElementById('btnViewerPrev').addEventListener('click', () => setViewerImage(viewerCurrentIndex - 1));
  document.getElementById('btnViewerNext').addEventListener('click', () => setViewerImage(viewerCurrentIndex + 1));
  
  document.getElementById('btnViewerAddToCart').addEventListener('click', () => {
    if (viewerCurrentItem) {
      addToQuoteCart(viewerCurrentItem.id);
      closeModal('imageViewerModal');
    }
  });

  // Stage container wheel zoom
  const stage = document.getElementById('viewerStageContainer');
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, { passive: false });

  // Pan dragging when zoomed in
  const panSurface = document.getElementById('viewerPanSurface');
  panSurface.addEventListener('mousedown', (e) => {
    if (viewerCurrentZoom > 1.0) {
      viewerIsDragging = true;
      viewerDragStartX = e.clientX - viewerPanX;
      viewerDragStartY = e.clientY - viewerPanY;
      panSurface.classList.add('is-panning');
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (viewerIsDragging) {
      viewerPanX = e.clientX - viewerDragStartX;
      viewerPanY = e.clientY - viewerDragStartY;
      updateZoomTransform();
    }
  });
  window.addEventListener('mouseup', () => {
    viewerIsDragging = false;
    panSurface.classList.remove('is-panning');
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('imageViewerModal');
    if (!modal.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') setViewerImage(viewerCurrentIndex - 1);
      else if (e.key === 'ArrowRight') setViewerImage(viewerCurrentIndex + 1);
      else if (e.key === '+' || e.key === '=') zoomIn();
      else if (e.key === '-' || e.key === '_') zoomOut();
      else if (e.key === '0') resetZoom();
      else if (e.key === 'Escape') closeModal('imageViewerModal');
    }
  });
}

function openImageViewer(itemId, startIndex = 0) {
  const item = allStorageItems.find(i => i.id === itemId);
  if (!item) return;

  viewerCurrentItem = item;
  viewerCurrentIndex = startIndex;
  viewerCurrentZoom = 1.0;
  viewerPanX = 0;
  viewerPanY = 0;

  document.getElementById('viewerItemTitle').textContent = item.name;
  document.getElementById('viewerItemPrice').textContent = formatCurrency(item.unit_price);
  document.getElementById('viewerItemCategory').textContent = `${item.category_icon || '📦'} ${item.category_name}`;
  document.getElementById('viewerItemDesc').textContent = item.description || 'Premium commercial wholesale product.';

  // Render thumbnails
  const images = (item.images && item.images.length > 0) ? item.images : [item.image_url];
  const strip = document.getElementById('viewerThumbnailsStrip');
  strip.innerHTML = images.map((imgSrc, idx) => `
    <button type="button" class="viewer-thumb-btn ${idx === startIndex ? 'active' : ''}" onclick="setViewerImage(${idx})" title="View Picture ${idx + 1}">
      <img src="${imgSrc}" alt="Photo ${idx + 1}">
    </button>
  `).join('');

  setViewerImage(startIndex);
  openModal('imageViewerModal');
}

function setViewerImage(index) {
  const images = (viewerCurrentItem.images && viewerCurrentItem.images.length > 0) ? viewerCurrentItem.images : [viewerCurrentItem.image_url];
  if (index < 0) index = images.length - 1;
  if (index >= images.length) index = 0;

  viewerCurrentIndex = index;
  viewerCurrentZoom = 1.0;
  viewerPanX = 0;
  viewerPanY = 0;

  const mainImg = document.getElementById('viewerMainImage');
  mainImg.src = images[viewerCurrentIndex];
  updateZoomTransform();

  // Update active thumbnail button
  document.querySelectorAll('.viewer-thumb-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === viewerCurrentIndex);
  });
}

function updateZoomTransform() {
  const mainImg = document.getElementById('viewerMainImage');
  mainImg.style.transform = `scale(${viewerCurrentZoom}) translate(${viewerPanX / viewerCurrentZoom}px, ${viewerPanY / viewerCurrentZoom}px)`;
  document.getElementById('zoomLevelDisplay').textContent = `${Math.round(viewerCurrentZoom * 100)}%`;
}

function zoomIn() {
  if (viewerCurrentZoom < 4.0) {
    viewerCurrentZoom = Math.min(4.0, +(viewerCurrentZoom + 0.3).toFixed(2));
    updateZoomTransform();
  }
}

function zoomOut() {
  if (viewerCurrentZoom > 0.6) {
    viewerCurrentZoom = Math.max(0.6, +(viewerCurrentZoom - 0.3).toFixed(2));
    if (viewerCurrentZoom <= 1.0) {
      viewerPanX = 0;
      viewerPanY = 0;
    }
    updateZoomTransform();
  }
}

function resetZoom() {
  viewerCurrentZoom = 1.0;
  viewerPanX = 0;
  viewerPanY = 0;
  updateZoomTransform();
}

// Switch User Persona (Admin vs Customer)
async function switchUserPersona(role) {
  try {
    let email = role === 'admin' ? 'admin@logistics.com' : 'buyer@specialclient.com';
    let password = role === 'admin' ? 'admin123' : 'client123';

    const res = await apiCall('/api/auth/login', 'POST', { email, password });
    currentToken = res.token;
    currentUser = res.user;

    // Update Header active buttons
    document.getElementById('btnSwitchAdmin').classList.toggle('active', role === 'admin');
    document.getElementById('btnSwitchCustomer').classList.toggle('active', role === 'customer');

    // Update Header Profile Badge
    renderHeaderProfile();

    // Toggle Navigation links
    const adminNav = document.getElementById('adminNavLinks');
    const customerNav = document.getElementById('customerNavLinks');
    if (role === 'admin') {
      adminNav.classList.remove('hidden');
      customerNav.classList.add('hidden');
      setActiveTab('admin-inventory');
    } else {
      adminNav.classList.add('hidden');
      customerNav.classList.remove('hidden');
      setActiveTab('customer-catalog');
    }

    // Refresh categories & data
    await loadCategories();
    refreshCurrentTabData();

    showToast(`Switched view to ${role === 'admin' ? 'Logistics Admin' : 'Wholesale VIP Customer'}`, 'success');
  } catch (err) {
    showToast('Failed to switch persona: ' + err.message, 'error');
  }
}

// Render Header Profile Area
function renderHeaderProfile() {
  const container = document.getElementById('headerAuthArea');
  if (!currentUser) {
    container.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="openModal('authModal')">Sign In</button>
    `;
    return;
  }

  const initials = currentUser.contact_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  container.innerHTML = `
    <div class="user-profile-badge">
      <div class="user-avatar-circle">${initials}</div>
      <div class="user-info-text">
        <span class="user-name-title">${currentUser.company_name}</span>
        <span class="user-role-tag">${currentUser.role === 'admin' ? '🛡️ Logistics Admin' : '⭐ VIP Customer'}</span>
      </div>
    </div>
    <button class="btn-header-action" onclick="openModal('authModal')">Account / Sign Out</button>
  `;
}

// Set Active Tab
function setActiveTab(tabId) {
  currentTab = tabId;

  // Update nav buttons
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Update tab content panes
  document.querySelectorAll('.tab-content').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  refreshCurrentTabData();
}

// Refresh Data for current tab
function refreshCurrentTabData() {
  if (currentTab === 'admin-inventory') {
    loadAdminStorageItems();
  } else if (currentTab === 'admin-quotations') {
    loadAdminQuotations();
  } else if (currentTab === 'admin-requests') {
    loadAdminQuoteRequests();
  } else if (currentTab === 'admin-customers') {
    loadAdminCustomers();
  } else if (currentTab === 'customer-catalog') {
    loadCustomerCatalog();
  } else if (currentTab === 'customer-quotations') {
    loadCustomerQuotations();
  } else if (currentTab === 'customer-cart') {
    renderCart();
  }
}

// Load Categories
async function loadCategories() {
  try {
    const res = await apiCall('/api/categories');
    categories = res.categories || [];

    // Populate category dropdowns
    const adminSelect = document.getElementById('adminCategoryFilter');
    const customerSelect = document.getElementById('customerCategoryFilter');
    const itemModalCat = document.getElementById('itemCategory');

    const filterOptions = '<option value="all">All Categories</option>' +
      categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

    adminSelect.innerHTML = filterOptions;
    customerSelect.innerHTML = filterOptions;

    itemModalCat.innerHTML = categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

// ====================================================================
// ADMIN LOGISTICS & STORAGE INVENTORY
// ====================================================================
async function loadAdminStorageItems() {
  const tbody = document.getElementById('storageItemsTableBody');
  tbody.innerHTML = '<tr><td colspan="11" class="text-center" style="padding: 24px;">Loading storage inventory...</td></tr>';

  const q = document.getElementById('adminSearchInput').value;
  const category = document.getElementById('adminCategoryFilter').value;
  const zone = document.getElementById('adminZoneFilter').value;

  try {
    let url = `/api/admin/storage-items?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&zone=${encodeURIComponent(zone)}`;
    const data = await apiCall(url);
    allStorageItems = data.items || [];

    // Update KPI counters
    if (data.stats) {
      document.getElementById('kpiTotalSkus').textContent = data.stats.total_skus || 0;
      document.getElementById('kpiTotalCartons').textContent = Number(data.stats.total_cartons).toLocaleString();
      document.getElementById('kpiTotalUnits').textContent = Number(data.stats.total_units_in_stock).toLocaleString();
      document.getElementById('kpiTotalValue').textContent = formatCurrency(data.stats.total_inventory_value);
    }

    if (allStorageItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center" style="padding: 24px;">No storage items match your search.</td></tr>';
      return;
    }

    tbody.innerHTML = allStorageItems.map(item => {
      const photosCount = (item.images && item.images.length > 0) ? item.images.length : 1;
      return `
        <tr>
          <td>
            <input type="checkbox" class="item-select-checkbox" data-id="${item.id}" ${selectedItemIdsForQuote.has(item.id) ? 'checked' : ''}>
          </td>
          <td>
            <div class="table-img-cell" onclick="openImageViewer(${item.id})" title="Click to view all ${photosCount} photos & zoom in">
              <img src="${item.image_url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80'}" class="item-thumb" alt="${item.name}">
              <span class="img-change-overlay">🔍 View (${photosCount})</span>
            </div>
          </td>
          <td>
            <span class="item-sku-badge">${item.sku}</span>
            <span class="item-name-bold" onclick="openImageViewer(${item.id})" style="cursor: pointer;" title="Click to view photos">${item.name}</span>
            <small style="color: #64748b; font-size: 11px;">📷 ${photosCount} Photos • ${item.description ? item.description.substring(0, 45) + '...' : ''}</small>
          </td>
          <td>
            <span>${item.category_icon || '📦'} ${item.category_name}</span>
          </td>
          <td>
            <span class="carton-count-badge">📦 ${item.carton_count} Cartons</span>
          </td>
          <td>
            <div class="carton-units-breakdown">
              <strong>${item.units_per_carton}</strong> / box
              ${item.loose_units > 0 ? `<br><small>+${item.loose_units} loose</small>` : ''}
            </div>
          </td>
          <td>
            <span class="total-units-pill">${item.total_units.toLocaleString()} units</span>
          </td>
          <td>
            <span class="orientation-pill">🧭 ${item.special_orientation}</span>
          </td>
          <td>
            <div class="location-badge">
              <span class="location-zone">${item.warehouse_zone}</span>
              <span class="location-bin">📍 ${item.storage_location}</span>
            </div>
          </td>
          <td>
            <span class="price-tag">${formatCurrency(item.unit_price)}</span>
            ${item.cost_price ? `<br><small style="color: #94a3b8;">Cost: ${formatCurrency(item.cost_price)}</small>` : ''}
          </td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" onclick="triggerQuickUpload(${item.id})" title="Add picture from desktop">📷</button>
              <button class="btn btn-secondary btn-sm" onclick="openEditItemModal(${item.id})" title="Edit Item Details">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="deleteStorageItem(${item.id})" title="Delete Item">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Reattach individual checkbox listeners
    document.querySelectorAll('.item-select-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id, 10);
        if (e.target.checked) selectedItemIdsForQuote.add(id);
        else selectedItemIdsForQuote.delete(id);
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="color: red; padding: 20px;">Error loading items: ${err.message}</td></tr>`;
  }
}

// Reset / Prepare Item Form
function resetItemForm() {
  document.getElementById('itemModalTitle').textContent = 'Add New Storage Item';
  document.getElementById('editItemId').value = '';
  document.getElementById('itemSku').value = '';
  document.getElementById('itemName').value = '';
  document.getElementById('itemUnitPrice').value = '';
  document.getElementById('itemCostPrice').value = '';
  document.getElementById('itemDescription').value = '';
  resetModalDropzone();
  document.getElementById('itemCartonCount').value = '10';
  document.getElementById('itemUnitsPerCarton').value = '24';
  document.getElementById('itemLooseUnits').value = '0';
  document.getElementById('itemWarehouseZone').value = 'Zone A - Fragile Goods Vault';
  document.getElementById('itemStorageLocation').value = '';
  document.getElementById('calcTotalUnitsDisplay').textContent = '240 units';
}

// Edit Item Modal - Prepopulates all 4, 5+ pictures!
function openEditItemModal(itemId) {
  const item = allStorageItems.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('itemModalTitle').textContent = `Edit Storage Item (${item.sku})`;
  document.getElementById('editItemId').value = item.id;
  document.getElementById('itemSku').value = item.sku;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemCategory').value = item.category_id;
  document.getElementById('itemUnitPrice').value = item.unit_price;
  document.getElementById('itemCostPrice').value = item.cost_price || '';
  document.getElementById('itemDescription').value = item.description || '';
  
  // Load existing pictures into uploadedItemImages array
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    uploadedItemImages = [...item.images];
  } else if (item.image_url) {
    uploadedItemImages = [item.image_url];
  } else {
    uploadedItemImages = [];
  }
  renderUploadedGallery();

  document.getElementById('itemCartonCount').value = item.carton_count;
  document.getElementById('itemUnitsPerCarton').value = item.units_per_carton;
  document.getElementById('itemLooseUnits').value = item.loose_units;
  document.getElementById('itemSpecialOrientation').value = item.special_orientation;
  document.getElementById('itemWarehouseZone').value = item.warehouse_zone;
  document.getElementById('itemStorageLocation').value = item.storage_location;

  const total = (item.carton_count * item.units_per_carton) + item.loose_units;
  document.getElementById('calcTotalUnitsDisplay').textContent = `${total} units`;

  openModal('itemModal');
}

// Save / Update Storage Item
async function handleSaveStorageItem(e) {
  e.preventDefault();

  const itemId = document.getElementById('editItemId').value;
  const images = uploadedItemImages.length > 0 
    ? uploadedItemImages 
    : ['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80'];

  const payload = {
    sku: document.getElementById('itemSku').value,
    name: document.getElementById('itemName').value,
    category_id: parseInt(document.getElementById('itemCategory').value, 10),
    unit_price: parseFloat(document.getElementById('itemUnitPrice').value),
    cost_price: parseFloat(document.getElementById('itemCostPrice').value || 0),
    description: document.getElementById('itemDescription').value,
    image_url: images[0],
    images: images,
    carton_count: parseInt(document.getElementById('itemCartonCount').value || 0, 10),
    units_per_carton: parseInt(document.getElementById('itemUnitsPerCarton').value || 1, 10),
    loose_units: parseInt(document.getElementById('itemLooseUnits').value || 0, 10),
    special_orientation: document.getElementById('itemSpecialOrientation').value,
    warehouse_zone: document.getElementById('itemWarehouseZone').value,
    storage_location: document.getElementById('itemStorageLocation').value
  };

  try {
    if (itemId) {
      await apiCall(`/api/admin/storage-items/${itemId}`, 'PUT', payload);
      showToast('Storage item updated with pictures successfully!', 'success');
    } else {
      await apiCall('/api/admin/storage-items', 'POST', payload);
      showToast('New storage item added to warehouse inventory!', 'success');
    }
    closeModal('itemModal');
    loadAdminStorageItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete Storage Item
async function deleteStorageItem(itemId) {
  if (!confirm('Are you sure you want to delete this storage item from the warehouse?')) return;
  try {
    await apiCall(`/api/admin/storage-items/${itemId}`, 'DELETE');
    showToast('Storage item deleted', 'info');
    loadAdminStorageItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ====================================================================
// AUTO-GENERATE & CUSTOM QUOTATION BUILDER
// ====================================================================
async function openGenerateQuoteModal(includeAll = false) {
  try {
    // Load customers dropdown
    const customersData = await apiCall('/api/admin/customers');
    const customerSelect = document.getElementById('quoteCustomerSelect');
    customerSelect.innerHTML = customersData.customers.map(c => `
      <option value="${c.id}">${c.company_name} — ${c.contact_name} (${c.email})</option>
    `).join('');

    // Random access code
    document.getElementById('quoteAccessPassword').value = 'QUOTE-VIP-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('quoteValidUntil').value = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    // Determine items to include
    let itemsToPreview = [];
    if (includeAll || selectedItemIdsForQuote.size === 0) {
      itemsToPreview = allStorageItems;
      selectedItemIdsForQuote = new Set(allStorageItems.map(i => i.id));
    } else {
      itemsToPreview = allStorageItems.filter(i => selectedItemIdsForQuote.has(i.id));
    }

    document.getElementById('quoteItemsSelectedCount').textContent = 
      `${selectedItemIdsForQuote.size} Storage Items Selected for Quotation`;

    const previewList = document.getElementById('quoteItemsPreviewList');
    previewList.innerHTML = itemsToPreview.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" class="quote-modal-item-checkbox" data-id="${item.id}" checked>
          <img src="${item.image_url}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px;">
          <div>
            <strong style="font-size: 13px;">${item.name}</strong>
            <div style="font-size: 11px; color: #64748b;">${item.category_name}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <strong style="font-family: var(--font-mono); color: #059669;">${formatCurrency(item.unit_price)}</strong>
        </div>
      </div>
    `).join('');

    // Toggle all items button inside modal
    document.getElementById('btnToggleAllQuoteItems').onclick = () => {
      const allChecked = selectedItemIdsForQuote.size === allStorageItems.length;
      if (allChecked) {
        selectedItemIdsForQuote.clear();
      } else {
        selectedItemIdsForQuote = new Set(allStorageItems.map(i => i.id));
      }
      document.querySelectorAll('.quote-modal-item-checkbox').forEach(cb => {
        cb.checked = !allChecked;
      });
      document.getElementById('quoteItemsSelectedCount').textContent = 
        `${selectedItemIdsForQuote.size} Storage Items Selected for Quotation`;
    };

    openModal('generateQuoteModal');
  } catch (err) {
    showToast('Failed to open quotation builder: ' + err.message, 'error');
  }
}

// Create Quotation Submit
async function handleCreateQuotation(e) {
  e.preventDefault();

  const selectedIds = Array.from(selectedItemIdsForQuote);
  if (selectedIds.length === 0) {
    showToast('Please select at least one storage item to include in quotation', 'error');
    return;
  }

  const payload = {
    customer_id: parseInt(document.getElementById('quoteCustomerSelect').value, 10),
    title: document.getElementById('quoteTitle').value,
    access_password: document.getElementById('quoteAccessPassword').value,
    status: document.getElementById('quoteAgreementStatus').value,
    valid_until: document.getElementById('quoteValidUntil').value,
    notes: document.getElementById('quoteNotes').value,
    discount_percentage: parseFloat(document.getElementById('quoteDiscount').value || 0),
    selected_item_ids: selectedIds
  };

  try {
    const res = await apiCall('/api/admin/quotations', 'POST', payload);
    showToast(`Quotation ${res.quote_number} generated! Access Password: ${res.access_password}`, 'success');
    closeModal('generateQuoteModal');
    setActiveTab('admin-quotations');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load Admin Quotations Studio
async function loadAdminQuotations() {
  const container = document.getElementById('adminQuotationsGrid');
  container.innerHTML = '<p>Loading quotations...</p>';

  try {
    const data = await apiCall('/api/admin/quotations');
    const quotations = data.quotations || [];

    if (quotations.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">📄</div>
          <h3>No Quotations Issued Yet</h3>
          <p>Click "Create Custom Quotation" or "Auto-Generate Quotation" from the Storage screen.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = quotations.map(q => `
      <div class="quote-card">
        <div class="quote-card-header">
          <span class="quote-num">${q.quote_number}</span>
          <span class="quote-badge ${q.status === 'approved_sent' ? 'badge-approved' : 'badge-draft'}">
            ${q.status === 'approved_sent' ? '✅ Agreed & Sent' : '📝 Draft'}
          </span>
        </div>
        <div class="quote-title">${q.title}</div>
        <div class="quote-customer-line">
          🏢 <strong>${q.customer_company}</strong> (${q.customer_name})
        </div>
        <div class="quote-password-box">
          <span class="password-label">Quotation Access Password:</span>
          <span class="password-code">${q.access_password}</span>
        </div>
        <div style="font-size: 12px; color: #64748b;">
          📦 ${q.item_count} items included • Valid until: ${q.valid_until || 'Indefinite'}
          ${q.discount_percentage > 0 ? `• Discount: ${q.discount_percentage}%` : ''}
        </div>
        <div class="quote-card-footer">
          <span class="quote-total">${formatCurrency(q.total_amount)}</span>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="viewQuotationDocument(${q.id}, true)">
              👁️ View & Print
            </button>
            <button class="btn btn-primary btn-sm" onclick="toggleQuotationApproval(${q.id}, '${q.status === 'approved_sent' ? 'draft' : 'approved_sent'}')">
              ${q.status === 'approved_sent' ? 'Pause Send' : 'Agree & Send'}
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
  }
}

// Toggle Quotation Status (Agree to send)
async function toggleQuotationApproval(quoteId, newStatus) {
  try {
    await apiCall(`/api/admin/quotations/${quoteId}/status`, 'PUT', { status: newStatus });
    showToast(`Quotation status changed to ${newStatus === 'approved_sent' ? 'Agreed & Sent' : 'Draft'}`, 'success');
    loadAdminQuotations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load Admin Quote Requests
async function loadAdminQuoteRequests() {
  const container = document.getElementById('adminRequestsList');
  container.innerHTML = '<p>Loading inquiries...</p>';

  try {
    const data = await apiCall('/api/admin/quote-requests');
    const requests = data.requests || [];

    document.getElementById('pendingRequestsBadge').textContent = requests.filter(r => r.status === 'pending').length;

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📥</div>
          <h3>No Pending Customer Quote Requests</h3>
          <p>Customer inquiries submitted through their catalog cart will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = requests.map(r => {
      let items = [];
      try { items = JSON.parse(r.items_json); } catch (e) {}
      return `
        <div class="customer-quote-row" style="margin-bottom: 16px;">
          <div>
            <h3>${r.company_name} — ${r.contact_name}</h3>
            <p style="font-size: 13px; color: #475569; margin: 4px 0;">
              📧 ${r.email} • 📞 ${r.phone || 'N/A'} • Submitted on: ${new Date(r.created_at).toLocaleString()}
            </p>
            <p style="font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 6px;">
              <strong>Customer Note:</strong> ${r.requested_notes || 'No special instructions provided.'}
            </p>
            <div style="margin-top: 8px; font-size: 12px;">
              <strong>Requested Items (${items.length}):</strong>
              ${items.map(i => `<span style="display:inline-block; margin-right:8px; background:#eff6ff; padding:2px 8px; border-radius:12px; color:#1e40af;">${i.name} (Qty: ${i.quantity})</span>`).join('')}
            </div>
          </div>
          <div>
            <button class="btn btn-accent btn-sm" onclick="convertRequestToQuotation(${r.customer_id}, ${r.id})">
              ⚡ Convert to Official Quotation
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
  }
}

// Convert Customer Request to Quotation
function convertRequestToQuotation(customerId, requestId) {
  openGenerateQuoteModal(false);
  document.getElementById('quoteCustomerSelect').value = customerId;
}

// Load Admin Customers
async function loadAdminCustomers() {
  const tbody = document.getElementById('customersTableBody');
  tbody.innerHTML = '<tr><td colspan="7">Loading customer accounts...</td></tr>';

  try {
    const data = await apiCall('/api/admin/customers');
    const customers = data.customers || [];

    tbody.innerHTML = customers.map(c => `
      <tr>
        <td><strong>${c.company_name}</strong></td>
        <td>${c.contact_name}</td>
        <td>${c.email}</td>
        <td>${c.phone || '—'}</td>
        <td><span class="quote-badge badge-approved">${c.status}</span></td>
        <td><strong>${c.quote_count}</strong> Quotations</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="createQuoteForCustomer(${c.id})">
            + Issue Quote
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: red;">Error: ${err.message}</td></tr>`;
  }
}

function createQuoteForCustomer(customerId) {
  openGenerateQuoteModal(true);
  document.getElementById('quoteCustomerSelect').value = customerId;
}

// ====================================================================
// WHOLESALE CUSTOMER PORTAL
// STRICT PRIVACY: NEVER LEAKS STOCK QUANTITIES OR STORAGE LOCATIONS
// ALLOWS ZOOMING IN ON ALL 4, 5+ PICTURES!
// ====================================================================
async function loadCustomerCatalog() {
  const container = document.getElementById('customerCatalogGrid');
  container.innerHTML = '<p style="grid-column: 1 / -1; padding: 20px;">Loading catalog products...</p>';

  const q = document.getElementById('customerSearchInput').value;
  const category = document.getElementById('customerCategoryFilter').value;

  try {
    const url = `/api/customer/catalog?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`;
    const data = await apiCall(url);
    const items = data.items || [];

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🛍️</div>
          <h3>No Products Found</h3>
          <p>Try searching for a different item name or select another category.</p>
        </div>
      `;
      return;
    }

    // STRICT: Only Picture, Item Name, Category, Description, and Wholesale Price!
    container.innerHTML = items.map(item => {
      const photosCount = (item.images && item.images.length > 0) ? item.images.length : 1;
      return `
        <div class="catalog-card">
          <div class="catalog-img-wrapper" onclick="openImageViewer(${item.id})" title="Click to view all ${photosCount} photos in full size & zoom in">
            <img src="${item.image_url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80'}" alt="${item.name}">
            <span class="catalog-cat-badge">${item.category_icon || '📦'} ${item.category_name}</span>
            <span class="catalog-photo-count-pill">📷 ${photosCount} Photos • Click to Zoom</span>
          </div>
          <div class="catalog-body">
            <h3 class="catalog-title" onclick="openImageViewer(${item.id})" style="cursor: pointer;" title="Click to view details & photos">${item.name}</h3>
            <p class="catalog-desc">${item.description || 'Premium wholesale item. Certified high quality.'}</p>
            <div class="catalog-footer">
              <div class="catalog-price-box">
                <span class="price-caption">Wholesale Price</span>
                <span class="catalog-price">${formatCurrency(item.unit_price)}</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm" onclick="openImageViewer(${item.id})" title="View and zoom into pictures">
                  🔍 Zoom (${photosCount})
                </button>
                <button class="btn btn-primary btn-sm" onclick="addToQuoteCart(${item.id})">
                  ➕ Add to Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="grid-column: 1 / -1; color: red;">Error: ${err.message}</p>`;
  }
}

// Add Item to Customer Quote Cart
async function addToQuoteCart(itemId) {
  let item = allStorageItems.find(i => i.id === itemId);
  if (!item) {
    const catalogData = await apiCall('/api/customer/catalog');
    item = catalogData.items.find(i => i.id === itemId);
  }
  if (!item) return;

  const existing = cart.find(ci => ci.item.id === itemId);
  if (existing) {
    existing.quantity += 10; // wholesale batch step
    showToast(`Increased quantity of ${item.name} in your quote request (+10)`, 'info');
  } else {
    cart.push({ item, quantity: 25 }); // default wholesale batch
    showToast(`Added ${item.name} to your quote request cart`, 'success');
  }

  updateCartBadges();
}

// Update Cart Badges
function updateCartBadges() {
  const count = cart.length;
  document.getElementById('cartCountBadge').textContent = count;
  document.getElementById('cartCountBtn').textContent = count;
}

// Render Cart
function renderCart() {
  const emptyState = document.getElementById('cartEmptyState');
  const itemsList = document.getElementById('cartItemsList');
  const summaryPanel = document.getElementById('cartSummaryPanel');

  if (cart.length === 0) {
    emptyState.classList.remove('hidden');
    itemsList.classList.add('hidden');
    summaryPanel.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  itemsList.classList.remove('hidden');
  summaryPanel.classList.remove('hidden');

  let totalUnits = 0;
  itemsList.innerHTML = cart.map((entry, index) => {
    totalUnits += entry.quantity;
    return `
      <div class="cart-item-row">
        <img src="${entry.item.image_url}" class="cart-item-img" alt="${entry.item.name}">
        <div class="cart-item-details">
          <div class="cart-item-name">${entry.item.name}</div>
          <div style="font-size: 11px; color: #64748b;">${entry.item.category_name}</div>
          <div class="cart-item-price">${formatCurrency(entry.item.unit_price)} / unit</div>
        </div>
        <div class="cart-qty-ctrl">
          <label style="font-size: 11px; font-weight: 700; color: #64748b;">Requested Qty:</label>
          <input type="number" min="1" step="1" value="${entry.quantity}" onchange="updateCartQuantity(${index}, this.value)">
          <button class="btn btn-danger btn-sm" onclick="removeCartItem(${index})">✕</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartSummaryItemsCount').textContent = cart.length;
  document.getElementById('cartSummaryUnitsCount').textContent = totalUnits.toLocaleString() + ' units';
}

function updateCartQuantity(index, newQty) {
  const qty = parseInt(newQty, 10);
  if (qty > 0) {
    cart[index].quantity = qty;
    renderCart();
  }
}

function removeCartItem(index) {
  cart.splice(index, 1);
  updateCartBadges();
  renderCart();
}

// Submit Quote Request to Company
async function handleSubmitQuoteRequest() {
  if (cart.length === 0) return;

  const notes = document.getElementById('quoteRequestNotes').value;
  const payload = {
    items: cart.map(ci => ({
      id: ci.item.id,
      name: ci.item.name,
      quantity: ci.quantity,
      unit_price: ci.item.unit_price
    })),
    notes
  };

  try {
    const res = await apiCall('/api/customer/request-quote', 'POST', payload);
    showToast(res.message, 'success');
    cart = [];
    updateCartBadges();
    renderCart();
    setActiveTab('customer-quotations');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ====================================================================
// CUSTOMER QUOTATIONS (PASSWORD PROTECTED UNLOCK)
// ====================================================================
async function loadCustomerQuotations() {
  const container = document.getElementById('customerQuotesList');
  container.innerHTML = '<p>Loading your wholesale quotations...</p>';

  try {
    const data = await apiCall('/api/customer/quotations');
    const quotations = data.quotations || [];

    if (quotations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔐</div>
          <h3>No Active Quotations Issued Yet</h3>
          <p>Browse our catalog and submit a quotation request, or contact your sales rep for an authorization code.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = quotations.map(q => `
      <div class="customer-quote-row">
        <div class="customer-quote-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="quote-num">${q.quote_number}</span>
            <span class="quote-badge badge-approved">Approved & Sent</span>
            ${q.is_password_protected ? '<span style="font-size: 11px; background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 2px 8px; border-radius: 4px;">🔒 Password Protected</span>' : ''}
          </div>
          <h3>${q.title}</h3>
          <div class="quote-meta-tags">
            <span>📅 Issued: ${new Date(q.created_at).toLocaleDateString()}</span>
            <span>⏳ Valid Until: ${q.valid_until || 'Indefinite'}</span>
            ${q.discount_percentage > 0 ? `<span>🏷️ ${q.discount_percentage}% Wholesale Discount Applied</span>` : ''}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Quoted Total</div>
            <div style="font-family: var(--font-mono); font-size: 20px; font-weight: 800; color: #047857;">
              ${formatCurrency(q.total_amount)}
            </div>
          </div>
          <button class="btn btn-primary" onclick="promptUnlockQuotation(${q.id})">
            🔑 Unlock & View Quotation
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
  }
}

// Prompt Password to Unlock Quotation
function promptUnlockQuotation(quoteId) {
  pendingUnlockQuoteId = quoteId;
  document.getElementById('quoteUnlockInput').value = '';
  document.getElementById('unlockErrorMsg').classList.add('hidden');
  openModal('passwordModal');
}

// Handle Unlock Quotation
async function handleUnlockQuotation() {
  const password = document.getElementById('quoteUnlockInput').value;
  if (!password) {
    document.getElementById('unlockErrorMsg').textContent = 'Please enter the quotation password.';
    document.getElementById('unlockErrorMsg').classList.remove('hidden');
    return;
  }

  try {
    const res = await apiCall(`/api/customer/quotations/${pendingUnlockQuoteId}/unlock`, 'POST', { password });
    closeModal('passwordModal');
    showToast('Quotation successfully unlocked!', 'success');

    // Display the official quotation document
    renderQuotationDocument(res.quotation, res.items);
    openModal('viewQuotationModal');
  } catch (err) {
    const errorBox = document.getElementById('unlockErrorMsg');
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  }
}

// View Quotation Document (Admin direct view)
async function viewQuotationDocument(quoteId, isAdmin = false) {
  try {
    let res;
    if (isAdmin) {
      res = await apiCall(`/api/admin/quotations/${quoteId}`);
    } else {
      promptUnlockQuotation(quoteId);
      return;
    }

    renderQuotationDocument(res.quotation, res.items);
    openModal('viewQuotationModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Render Official Quotation Document (Strictly: Name, Picture, Description, Price, Totals)
// NO storage locations, NO carton counts, NO inventory balance!
function renderQuotationDocument(quote, items) {
  const container = document.getElementById('quotationDocumentContent');

  container.innerHTML = `
    <div class="quote-doc-header">
      <div class="company-doc-brand">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <img src="images/viper-logo.webp" style="width:48px; height:48px; border-radius:8px; object-fit:cover; background:#000; border: 1px solid #334155;">
          <h2>The Viper Group</h2>
        </div>
        <p>Global Freight, Warehousing & B2B Commercial Distribution</p>
        <p>VIP Logistics Hub, Dock 14 • Tel: +1 (555) 019-2834 • Email: sales@vipergroup.com</p>
      </div>
      <div class="quote-doc-meta">
        <div class="doc-quote-number">${quote.quote_number}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${new Date(quote.created_at).toLocaleDateString()}</div>
        <div style="font-size: 12px; color: #dc2626; font-weight: 600;">Valid Until: ${quote.valid_until || '30 Days From Issue'}</div>
      </div>
    </div>

    <div class="doc-client-section">
      <div>
        <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Quotation Prepared For:</strong>
        <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">
          ${quote.customer_company || currentUser.company_name}
        </div>
        <div style="color: #475569;">Attention: ${quote.contact_name || currentUser.contact_name}</div>
        <div style="color: #475569;">${quote.email || currentUser.email}</div>
      </div>
      <div style="text-align: right;">
        <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Quotation Subject:</strong>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px;">${quote.title}</div>
        <div style="font-size: 12px; color: #059669; font-weight: 700; margin-top: 2px;">Status: Authorized Wholesale Quote</div>
      </div>
    </div>

    <!-- Strictly: Name, Description, Picture, Unit Price, Line Total -->
    <table class="doc-items-table">
      <thead>
        <tr>
          <th width="70">Item</th>
          <th>Product Name & Specifications</th>
          <th>Category</th>
          <th style="text-align: right;">Wholesale Unit Price</th>
          <th style="text-align: center;">Quoted Qty</th>
          <th style="text-align: right;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(i => `
          <tr>
            <td>
              <img src="${i.item_image_url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;">
            </td>
            <td>
              <strong style="color: #0f172a; font-size: 14px;">${i.item_name}</strong>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                ${i.item_description || 'High quality wholesale standard.'}
              </div>
            </td>
            <td>
              <span style="font-size: 12px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">
                ${i.category_name || 'Wholesale'}
              </span>
            </td>
            <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">
              ${formatCurrency(i.unit_price)}
            </td>
            <td style="text-align: center; font-family: var(--font-mono); font-weight: 700;">
              ${i.requested_quantity}
            </td>
            <td style="text-align: right; font-family: var(--font-mono); font-weight: 800; color: #047857;">
              ${formatCurrency(i.line_total)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="doc-totals-box">
      <table class="doc-totals-table">
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${formatCurrency(quote.subtotal)}</td>
        </tr>
        ${quote.discount_percentage > 0 ? `
          <tr>
            <td>Wholesale Discount (${quote.discount_percentage}%):</td>
            <td style="text-align: right; font-family: var(--font-mono); color: #dc2626; font-weight: 700;">
              -${formatCurrency(quote.subtotal * (quote.discount_percentage / 100))}
            </td>
          </tr>
        ` : ''}
        <tr>
          <td class="doc-total-grand">Total Quoted Amount:</td>
          <td class="doc-total-grand" style="text-align: right;">${formatCurrency(quote.total_amount)}</td>
        </tr>
      </table>
    </div>

    <div class="doc-footer-notes">
      <strong>Terms & Conditions:</strong>
      <p style="margin-top: 4px;">${quote.notes || 'Payment terms: 30 days upon confirmed shipping bill of lading. Shipping FOB Port Warehouse.'}</p>
      <p style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
        This document represents a legally binding wholesale commercial quotation issued by The Viper Group.
      </p>
    </div>
  `;
}

// ====================================================================
// MODAL CONTROLS & MANUAL AUTH
// ====================================================================
function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

async function handleManualLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await apiCall('/api/auth/login', 'POST', { email, password });
    currentToken = res.token;
    currentUser = res.user;

    closeModal('authModal');
    renderHeaderProfile();

    if (currentUser.role === 'admin') {
      document.getElementById('adminNavLinks').classList.remove('hidden');
      document.getElementById('customerNavLinks').classList.add('hidden');
      setActiveTab('admin-inventory');
    } else {
      document.getElementById('adminNavLinks').classList.add('hidden');
      document.getElementById('customerNavLinks').classList.remove('hidden');
      setActiveTab('customer-catalog');
    }

    showToast(`Signed in as ${currentUser.company_name}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleManualRegister(e) {
  e.preventDefault();
  const payload = {
    company_name: document.getElementById('regCompany').value,
    contact_name: document.getElementById('regContact').value,
    email: document.getElementById('regEmail').value,
    phone: document.getElementById('regPhone').value,
    password: document.getElementById('regPassword').value
  };

  try {
    const res = await apiCall('/api/auth/register', 'POST', payload);
    currentToken = res.token;
    currentUser = res.user;

    closeModal('authModal');
    renderHeaderProfile();

    document.getElementById('adminNavLinks').classList.add('hidden');
    document.getElementById('customerNavLinks').classList.remove('hidden');
    setActiveTab('customer-catalog');

    showToast('Wholesale registration successful! Welcome to the portal.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Utility debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
