import Dexie from 'dexie';

export const COMPONENT_TYPES = [
  'frame',
  'wheelset',
  'bottomBracket',
  'crank',
  'frontDerailleur',
  'rearDerailleur',
  'levers',
  'cassette',
  'chain',
  'seat',
  'seatPost',
  'headset',
  'stem',
  'fork',
  'handlebars',
];

export const COMPONENT_LABELS = {
  frame: 'Frame',
  wheelset: 'Wheelset',
  bottomBracket: 'Bottom Bracket',
  crank: 'Crank',
  frontDerailleur: 'Front Derailleur',
  rearDerailleur: 'Rear Derailleur',
  levers: 'Levers',
  cassette: 'Cassette',
  chain: 'Chain',
  seat: 'Seat',
  seatPost: 'Seat Post',
  headset: 'Headset',
  stem: 'Stem',
  fork: 'Fork',
  handlebars: 'Handlebars',
};

export const COMPONENT_STATUSES = ['planned', 'ordered', 'received', 'installed'];
export const ORDER_STATUSES = ['pending', 'shipped', 'delivered', 'cancelled'];

export const db = new Dexie('BikeBuildTracker');

db.version(1).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
});

// v2: adds sourceUrl field to components
db.version(2).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
});

// v3: adds extras table for accessories, spacers, pedals, etc.
db.version(3).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
});

// v4: adds 'levers' component type — backfills stub into existing builds
db.version(4).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
}).upgrade(async tx => {
  const builds = await tx.table('builds').toArray();
  for (const build of builds) {
    const existing = await tx.table('components')
      .where({ buildId: build.id, type: 'levers' }).first();
    if (!existing) {
      await tx.table('components').add({
        buildId: build.id, type: 'levers', name: '', imageUrls: [],
        price: '', description: '', notes: '', sourceUrl: '', status: 'planned',
      });
    }
  }
});

// v5: migrates imageUrl (string) → imageUrls (array) on components and extras
db.version(5).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
}).upgrade(async tx => {
  await tx.table('components').toCollection().modify(comp => {
    if (!Array.isArray(comp.imageUrls)) {
      comp.imageUrls = comp.imageUrl ? [comp.imageUrl] : [];
      delete comp.imageUrl;
    }
  });
  await tx.table('extras').toCollection().modify(extra => {
    if (!Array.isArray(extra.imageUrls)) {
      extra.imageUrls = extra.imageUrl ? [extra.imageUrl] : [];
      delete extra.imageUrl;
    }
  });
});

// v6: adds geometry table for per-build frame geometry measurements
db.version(6).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
  geometry: '++id, &buildId',
});

// v7: adds customers CMS table and service jobs workflow table
db.version(7).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
  geometry: '++id, &buildId',
  customers: '++id, firstName, lastName, phone, city, state',
  jobs: '++id, customerId, title, stage, bikeModel, estimatedCost, notes, createdAt, updatedAt',
});

// v8: adds invoices table for quotes and invoices
db.version(8).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
  geometry: '++id, &buildId',
  customers: '++id, firstName, lastName, phone, city, state',
  jobs: '++id, customerId, title, stage, bikeModel, estimatedCost, notes, createdAt, updatedAt',
  invoices: '++id, customerId, type, status, issueDate, dueDate, createdAt, updatedAt',
});

// v9: adds email/stripe fields to customers, and stripe fields to invoices
db.version(9).stores({
  builds: '++id, name, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
  geometry: '++id, &buildId',
  customers: '++id, firstName, lastName, phone, email, stripeCustomerId, city, state',
  jobs: '++id, customerId, title, stage, bikeModel, estimatedCost, notes, createdAt, updatedAt',
  invoices: '++id, customerId, type, status, issueDate, dueDate, stripeInvoiceId, hostedInvoiceUrl, createdAt, updatedAt',
});

// v10: adds customerId index to builds for bookkeeping linkage
db.version(10).stores({
  builds: '++id, name, customerId, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
  geometry: '++id, &buildId',
  customers: '++id, firstName, lastName, phone, email, stripeCustomerId, city, state',
  jobs: '++id, customerId, title, stage, bikeModel, estimatedCost, notes, createdAt, updatedAt',
  invoices: '++id, customerId, type, status, issueDate, dueDate, stripeInvoiceId, hostedInvoiceUrl, createdAt, updatedAt',
});

// v11: adds manualPartsCosts table for manual bookkeeping cost entries
db.version(11).stores({
  builds: '++id, name, customerId, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
  geometry: '++id, &buildId',
  customers: '++id, firstName, lastName, phone, email, stripeCustomerId, city, state',
  jobs: '++id, customerId, title, stage, bikeModel, estimatedCost, notes, createdAt, updatedAt',
  invoices: '++id, customerId, type, status, issueDate, dueDate, stripeInvoiceId, hostedInvoiceUrl, createdAt, updatedAt',
  manualPartsCosts: '++id, customerId, name, price, createdAt',
});

// v12: adds receipts (metadata cache; the receipt files themselves live on the server)
db.version(12).stores({
  builds: '++id, name, customerId, createdAt, updatedAt',
  components: '++id, buildId, type, status',
  orders: '++id, buildId, componentType, status, orderDate',
  extras: '++id, buildId, status',
  geometry: '++id, &buildId',
  customers: '++id, firstName, lastName, phone, email, stripeCustomerId, city, state',
  jobs: '++id, customerId, title, stage, bikeModel, estimatedCost, notes, createdAt, updatedAt',
  invoices: '++id, customerId, type, status, issueDate, dueDate, stripeInvoiceId, hostedInvoiceUrl, createdAt, updatedAt',
  manualPartsCosts: '++id, customerId, name, price, createdAt',
  receipts: '++id, customerId, date, vendor, category, createdAt',
});

export async function associateCustomerToBuild(buildId, customerId) {
  const val = customerId ? parseInt(customerId) : null;
  try {
    const build = await db.builds.get(buildId);
    if (build) {
      await fetch(`${API_BASE}/builds/${buildId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: build.name, description: build.description || '', customerId: val })
      });
    }
  } catch (err) { console.warn('Server sync failed', err); }
  return db.builds.update(buildId, { customerId: val, updatedAt: new Date().toISOString() });
}

export async function addManualPartsCost(customerId, fields) {
  try {
    const res = await fetch(`${API_BASE}/manual-parts-costs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ customerId, name: fields.name, price: fields.price })
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.manualPartsCosts.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  return db.manualPartsCosts.add({
    customerId: customerId ? parseInt(customerId) : null,
    name: fields.name,
    price: parseFloat(fields.price) || 0,
    createdAt: new Date().toISOString()
  });
}

export async function deleteManualPartsCost(id) {
  try {
    await fetch(`${API_BASE}/manual-parts-costs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.manualPartsCosts.delete(id);
}

// Receipts: files are stored on the server only, so unlike other records there is no offline fallback.
async function receiptRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}/receipts${path}`, { ...options, headers: getAuthHeaders() });
  if (!isJsonResponse(res)) {
    let msg = 'Could not reach the workshop server.';
    try { msg = (await res.json()).error || msg; } catch { /* not JSON */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function addReceipt(fields) {
  const data = await receiptRequest('', { method: 'POST', body: JSON.stringify(fields) });
  await db.receipts.put(data);
  return data;
}

export async function updateReceipt(id, fields) {
  const data = await receiptRequest(`/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
  await db.receipts.put(data);
  return data;
}

export async function deleteReceipt(id) {
  await receiptRequest(`/${id}`, { method: 'DELETE' });
  return db.receipts.delete(id);
}

// Opens the full receipt file in a new tab (fetched with auth, then shown from a blob URL).
export async function openReceiptFile(id) {
  const tab = window.open('', '_blank');
  try {
    const res = await fetch(`${API_BASE}/receipts/${id}/file`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Could not load the receipt file.');
    const url = URL.createObjectURL(await res.blob());
    if (tab) {
      tab.location.href = url;
    } else if (!window.open(url, '_blank')) {
      URL.revokeObjectURL(url);
      throw new Error('Your browser blocked the pop-up. Allow pop-ups for this site to view receipts.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  } catch (err) {
    if (tab) tab.close();
    throw err;
  }
}

export async function migrateLocalBuildsToServer() {
  // 1. Get server builds to detect what's already there
  let serverBuilds = [];
  try {
    const r = await fetch(`${API_BASE}/builds`, { headers: getAuthHeaders() });
    if (isJsonResponse(r)) { const d = await r.json(); serverBuilds = d.builds || []; }
  } catch (_) {}

  // 2. Find local builds not yet on the server (by name+createdAt)
  const localBuilds = await db.builds.toArray();
  const toMigrate = localBuilds.filter(b =>
    !serverBuilds.some(s => s.name === b.name && s.createdAt === b.createdAt)
  );
  if (toMigrate.length === 0) {
    await syncWorkshopData();
    return 0;
  }

  const [allComps, allOrders, allExtras, allGeo] = await Promise.all([
    db.components.toArray(), db.orders.toArray(),
    db.extras.toArray(), db.geometry.toArray()
  ]);

  let migrated = 0;
  for (const build of toMigrate) {
    try {
      const res = await fetch(`${API_BASE}/builds/migrate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          build,
          components: allComps.filter(c => c.buildId === build.id),
          orders: allOrders.filter(o => o.buildId === build.id),
          extras: allExtras.filter(e => e.buildId === build.id),
          geometry: allGeo.find(g => g.buildId === build.id) || null
        })
      });
      if (isJsonResponse(res)) migrated++;
    } catch (err) { console.warn('Migration failed for build:', build.name, err); }
  }

  // 3. Full sync to replace local IDs with server IDs
  await syncWorkshopData();
  return migrated;
}



export async function saveGeometry(buildId, fields) {
  try {
    const res = await fetch(`${API_BASE}/builds/${buildId}/geometry`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(fields)
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.geometry.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed', err); }
  const existing = await db.geometry.where('buildId').equals(buildId).first();
  if (existing) return db.geometry.update(existing.id, { ...fields, updatedAt: new Date().toISOString() });
  return db.geometry.add({ buildId, ...fields, updatedAt: new Date().toISOString() });
}

export async function createBuild(name, description = '') {
  try {
    const res = await fetch(`${API_BASE}/builds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description })
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.builds.put(data.build);
      if (data.components?.length) await db.components.bulkPut(data.components);
      return data.build.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  // Offline fallback
  return db.transaction('rw', db.builds, db.components, async () => {
    const now = new Date().toISOString();
    const buildId = await db.builds.add({ name, description, createdAt: now, updatedAt: now });
    const stubs = COMPONENT_TYPES.map(type => ({ buildId, type, name: '', imageUrls: [], price: '', description: '', notes: '', sourceUrl: '', status: 'planned' }));
    await db.components.bulkAdd(stubs);
    return buildId;
  });
}

export async function deleteBuild(id) {
  try {
    await fetch(`${API_BASE}/builds/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.transaction('rw', db.builds, db.components, db.orders, db.extras, async () => {
    await db.components.where('buildId').equals(id).delete();
    await db.orders.where('buildId').equals(id).delete();
    await db.extras.where('buildId').equals(id).delete();
    await db.builds.delete(id);
  });
}

export async function addExtra(buildId, fields) {
  try {
    const res = await fetch(`${API_BASE}/builds/${buildId}/extras`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(fields)
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.extras.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  return db.extras.add({ buildId, ...fields, createdAt: new Date().toISOString() });
}

export async function updateExtra(id, fields) {
  try {
    await fetch(`${API_BASE}/extras/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(fields) });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.extras.update(id, fields);
}

export async function deleteExtra(id) {
  try {
    await fetch(`${API_BASE}/extras/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.extras.delete(id);
}

export async function renameBuild(id, name) {
  try {
    const build = await db.builds.get(id);
    await fetch(`${API_BASE}/builds/${id}`, {
      method: 'PUT', headers: getAuthHeaders(),
      body: JSON.stringify({ name, description: build?.description || '', customerId: build?.customerId ?? null })
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.builds.update(id, { name, updatedAt: new Date().toISOString() });
}

export async function updateComponent(id, fields) {
  try {
    await fetch(`${API_BASE}/components/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(fields) });
  } catch (err) { console.warn('Server sync failed', err); }
  const comp = await db.components.get(id);
  if (comp) await db.builds.update(comp.buildId, { updatedAt: new Date().toISOString() });
  return db.components.update(id, fields);
}

export async function addOrder(buildId, fields) {
  try {
    const res = await fetch(`${API_BASE}/builds/${buildId}/orders`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(fields)
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.orders.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  return db.orders.add({ buildId, ...fields, createdAt: new Date().toISOString() });
}

export async function updateOrder(id, fields) {
  try {
    await fetch(`${API_BASE}/orders/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(fields) });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.orders.update(id, fields);
}

export async function deleteOrder(id) {
  try {
    await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.orders.delete(id);
}

export function getCompletionCount(components) {
  return components.filter(c => c.name && c.name.trim() !== '').length;
}

export function getCompletionPercent(components) {
  return Math.round((getCompletionCount(components) / COMPONENT_TYPES.length) * 100);
}

export function getTotalPrice(components, extras = []) {
  const compTotal = components.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);
  const extrasTotal = extras.reduce((sum, e) => {
    const qty = parseInt(e.quantity) || 1;
    return sum + (parseFloat(e.price) || 0) * qty;
  }, 0);
  return compTotal + extrasTotal;
}

export async function exportBackup() {
  const builds = await db.builds.toArray();
  const components = await db.components.toArray();
  const orders = await db.orders.toArray();
  const extras = await db.extras.toArray();
  const geometry = await db.geometry.toArray();
  const customers = await db.customers.toArray();
  const jobs = await db.jobs.toArray();
  const manualPartsCosts = await db.manualPartsCosts.toArray();

  const data = {
    version: db.verno,
    timestamp: new Date().toISOString(),
    builds,
    components,
    orders,
    extras,
    geometry,
    customers,
    jobs,
    manualPartsCosts,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weeecycle-builds-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.builds || !data.components) {
    throw new Error('Invalid backup file format.');
  }

  await db.transaction('rw', db.builds, db.components, db.orders, db.extras, db.geometry, db.customers, db.jobs, db.manualPartsCosts, async () => {
    await db.builds.bulkPut(data.builds);
    await db.components.bulkPut(data.components);
    if (data.orders) await db.orders.bulkPut(data.orders);
    if (data.extras) await db.extras.bulkPut(data.extras);
    if (data.geometry) await db.geometry.bulkPut(data.geometry);
    if (data.customers) await db.customers.bulkPut(data.customers);
    if (data.jobs) await db.jobs.bulkPut(data.jobs);
    if (data.manualPartsCosts) await db.manualPartsCosts.bulkPut(data.manualPartsCosts);
  });
}

// Workshop Server Synchronization
const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('mechanic_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Safe helper: returns true only if response is OK AND returns JSON (not HTML)
function isJsonResponse(res) {
  if (!res.ok) return false;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

export async function syncWorkshopData() {
  try {
    const custRes = await fetch(`${API_BASE}/customers`, { headers: getAuthHeaders() });
    if (isJsonResponse(custRes)) {
      const customers = await custRes.json();
      const localCount = await db.customers.count();
      if (customers.length >= localCount) { await db.customers.clear(); await db.customers.bulkPut(customers); }
    }
    const jobRes = await fetch(`${API_BASE}/jobs`, { headers: getAuthHeaders() });
    if (isJsonResponse(jobRes)) {
      const jobs = await jobRes.json();
      const localCount = await db.jobs.count();
      if (jobs.length >= localCount) { await db.jobs.clear(); await db.jobs.bulkPut(jobs); }
    }
    const invRes = await fetch(`${API_BASE}/invoices`, { headers: getAuthHeaders() });
    if (isJsonResponse(invRes)) {
      const invoices = await invRes.json();
      const localCount = await db.invoices.count();
      if (invoices.length >= localCount) { await db.invoices.clear(); await db.invoices.bulkPut(invoices); }
    }
    const mpcRes = await fetch(`${API_BASE}/manual-parts-costs`, { headers: getAuthHeaders() });
    if (isJsonResponse(mpcRes)) {
      const manualPartsCosts = await mpcRes.json();
      if (manualPartsCosts.length > 0) { await db.manualPartsCosts.clear(); await db.manualPartsCosts.bulkPut(manualPartsCosts); }
    }
    const receiptsRes = await fetch(`${API_BASE}/receipts`, { headers: getAuthHeaders() });
    if (isJsonResponse(receiptsRes)) {
      await db.receipts.clear();
      await db.receipts.bulkPut(await receiptsRes.json());
    }
    // Sync builds + all nested data
    const buildsRes = await fetch(`${API_BASE}/builds`, { headers: getAuthHeaders() });
    if (isJsonResponse(buildsRes)) {
      const d = await buildsRes.json();
      const localBuildCount = await db.builds.count();
      if ((d.builds || []).length >= localBuildCount) {
        await db.builds.clear();
        await db.builds.bulkPut(d.builds || []);
        await db.components.clear();
        await db.components.bulkPut(d.components || []);
        await db.orders.clear();
        await db.orders.bulkPut(d.orders || []);
        await db.extras.clear();
        await db.extras.bulkPut(d.extras || []);
        await db.geometry.clear();
        await db.geometry.bulkPut(d.geometry || []);
      }
    }
  } catch (err) {
    console.warn('Offline or unable to reach workshop server. Using local Dexie cache.', err);
  }
}

// Customers CRUD helpers
export async function createCustomer(fields) {
  try {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(fields)
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.customers.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  return db.customers.add({ ...fields, createdAt: new Date().toISOString() });
}

export async function updateCustomer(id, fields) {
  try {
    await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(fields)
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.customers.update(id, { ...fields, updatedAt: new Date().toISOString() });
}

export async function deleteCustomer(id) {
  try {
    await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.transaction('rw', db.customers, db.jobs, async () => {
    await db.jobs.where('customerId').equals(id).delete();
    await db.customers.delete(id);
  });
}

// Service Jobs CRUD helpers
export async function createJob(fields) {
  try {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(fields)
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.jobs.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  const now = new Date().toISOString();
  return db.jobs.add({ ...fields, createdAt: now, updatedAt: now });
}

export async function updateJobStage(id, stage) {
  try {
    await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stage })
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.jobs.update(id, { stage, updatedAt: new Date().toISOString() });
}

export async function updateJob(id, fields) {
  try {
    await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(fields)
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.jobs.update(id, { ...fields, updatedAt: new Date().toISOString() });
}

export async function deleteJob(id) {
  try {
    await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.jobs.delete(id);
}

// Invoices CRUD helpers
export async function createInvoice(fields) {
  try {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(fields)
    });
    if (isJsonResponse(res)) {
      const data = await res.json();
      await db.invoices.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  const now = new Date().toISOString();
  const { bikeImage, ...local } = fields;
  return db.invoices.add({ ...local, hasBikeImage: !!bikeImage, createdAt: now, updatedAt: now });
}

// `bikeImage` on fields: a data URL replaces the photo, null removes it, undefined leaves it alone.
// The photo itself is never cached locally, only whether one exists.
export async function updateInvoice(id, fields) {
  try {
    await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(fields)
    });
  } catch (err) { console.warn('Server sync failed', err); }
  const { bikeImage, ...local } = fields;
  if (bikeImage !== undefined) local.hasBikeImage = !!bikeImage;
  return db.invoices.update(id, { ...local, updatedAt: new Date().toISOString() });
}

// Fetches an invoice's bike photo (needs the login) and returns a temporary URL for <img src>.
export async function fetchInvoiceImageUrl(id) {
  const res = await fetch(`${API_BASE}/invoices/${id}/image`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Could not load the bike photo.');
  return URL.createObjectURL(await res.blob());
}

export async function deleteInvoice(id) {
  try {
    await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.invoices.delete(id);
}

