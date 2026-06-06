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


export async function saveGeometry(buildId, fields) {
  const existing = await db.geometry.where('buildId').equals(buildId).first();
  if (existing) {
    return db.geometry.update(existing.id, { ...fields, updatedAt: new Date().toISOString() });
  }
  return db.geometry.add({ buildId, ...fields, updatedAt: new Date().toISOString() });
}

export async function createBuild(name, description = '') {
  return db.transaction('rw', db.builds, db.components, async () => {
    const now = new Date().toISOString();
    const buildId = await db.builds.add({ name, description, createdAt: now, updatedAt: now });
    const stubs = COMPONENT_TYPES.map(type => ({
      buildId,
      type,
      name: '',
      imageUrls: [],
      price: '',
      description: '',
      notes: '',
      sourceUrl: '',
      status: 'planned',
    }));
    await db.components.bulkAdd(stubs);
    return buildId;
  });
}

export async function deleteBuild(id) {
  return db.transaction('rw', db.builds, db.components, db.orders, db.extras, async () => {
    await db.components.where('buildId').equals(id).delete();
    await db.orders.where('buildId').equals(id).delete();
    await db.extras.where('buildId').equals(id).delete();
    await db.builds.delete(id);
  });
}

export async function addExtra(buildId, fields) {
  return db.extras.add({ buildId, ...fields, createdAt: new Date().toISOString() });
}

export async function updateExtra(id, fields) {
  return db.extras.update(id, fields);
}

export async function deleteExtra(id) {
  return db.extras.delete(id);
}

export async function renameBuild(id, name) {
  return db.builds.update(id, { name, updatedAt: new Date().toISOString() });
}

export async function updateComponent(id, fields) {
  const comp = await db.components.get(id);
  if (comp) {
    await db.builds.update(comp.buildId, { updatedAt: new Date().toISOString() });
  }
  return db.components.update(id, fields);
}

export async function addOrder(buildId, fields) {
  return db.orders.add({ buildId, ...fields, createdAt: new Date().toISOString() });
}

export async function updateOrder(id, fields) {
  return db.orders.update(id, fields);
}

export async function deleteOrder(id) {
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

  await db.transaction('rw', db.builds, db.components, db.orders, db.extras, db.geometry, db.customers, db.jobs, async () => {
    await db.builds.bulkPut(data.builds);
    await db.components.bulkPut(data.components);
    if (data.orders) await db.orders.bulkPut(data.orders);
    if (data.extras) await db.extras.bulkPut(data.extras);
    if (data.geometry) await db.geometry.bulkPut(data.geometry);
    if (data.customers) await db.customers.bulkPut(data.customers);
    if (data.jobs) await db.jobs.bulkPut(data.jobs);
  });
}

// Workshop Server Synchronization
const API_BASE = 'http://localhost:3000/api';

function getAuthHeaders() {
  const token = sessionStorage.getItem('mechanic_token') || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function syncWorkshopData() {
  try {
    const custRes = await fetch(`${API_BASE}/customers`, { headers: getAuthHeaders() });
    if (custRes.ok) {
      const customers = await custRes.json();
      await db.customers.clear();
      await db.customers.bulkPut(customers);
    }
    const jobRes = await fetch(`${API_BASE}/jobs`, { headers: getAuthHeaders() });
    if (jobRes.ok) {
      const jobs = await jobRes.json();
      await db.jobs.clear();
      await db.jobs.bulkPut(jobs);
    }
    const invRes = await fetch(`${API_BASE}/invoices`, { headers: getAuthHeaders() });
    if (invRes.ok) {
      const invoices = await invRes.json();
      await db.invoices.clear();
      await db.invoices.bulkPut(invoices);
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
    if (res.ok) {
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
    if (res.ok) {
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
    if (res.ok) {
      const data = await res.json();
      await db.invoices.put(data);
      return data.id;
    }
  } catch (err) { console.warn('Server sync failed, saving locally', err); }
  const now = new Date().toISOString();
  return db.invoices.add({ ...fields, createdAt: now, updatedAt: now });
}

export async function updateInvoice(id, fields) {
  try {
    await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(fields)
    });
  } catch (err) { console.warn('Server sync failed', err); }
  return db.invoices.update(id, { ...fields, updatedAt: new Date().toISOString() });
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

export async function sendStripeInvoice(id) {
  const res = await fetch(`${API_BASE}/invoices/${id}/send-stripe`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to send Stripe invoice');
  }
  const data = await res.json();
  await db.invoices.put(data.invoice);
  return data;
}

