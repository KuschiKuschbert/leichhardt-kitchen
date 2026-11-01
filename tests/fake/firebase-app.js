// Named Firebase apps keep their own Auth identity. Operational Firestore uses the default device app.
const apps = new Map();
export function initializeApp(cfg, name = '[DEFAULT]') {
  if (!apps.has(name)) apps.set(name, { cfg, options: cfg, name });
  return apps.get(name);
}
export function getApps() { return [...apps.values()]; }
export function getApp(name = '[DEFAULT]') { if (!apps.has(name)) throw { code: 'app/no-app' }; return apps.get(name); }
export function deleteApp(app) { apps.delete(app.name); return Promise.resolve(); }
