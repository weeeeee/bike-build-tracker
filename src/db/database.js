import Dexie from 'dexie';

export const COMPONENT_TYPES = [
  'frame',
  'wheelset',
  'bottomBracket',
  'crank',
  'frontDerailleur',
  'rearDerailleur',
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

export async function createBuild(name, description = '') {
  return db.transaction('rw', db.builds, db.components, async () => {
    const now = new Date().toISOString();
    const buildId = await db.builds.add({ name, description, createdAt: now, updatedAt: now });
    const stubs = COMPONENT_TYPES.map(type => ({
      buildId,
      type,
      name: '',
      imageUrl: '',
      price: '',
      description: '',
      notes: '',
      status: 'planned',
    }));
    await db.components.bulkAdd(stubs);
    return buildId;
  });
}

export async function deleteBuild(id) {
  return db.transaction('rw', db.builds, db.components, db.orders, async () => {
    await db.components.where('buildId').equals(id).delete();
    await db.orders.where('buildId').equals(id).delete();
    await db.builds.delete(id);
  });
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

export function getTotalPrice(components) {
  return components.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);
}
