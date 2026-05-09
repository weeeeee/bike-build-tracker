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
