// App-scoped Auth for synthetic browser journeys. Google credentials never replace the operational device UID.
const DEFAULT = '[DEFAULT]', OWNER = 'kitchen-owner', auths = new Map();
export const browserSessionPersistence = 'session';
export const browserLocalPersistence = 'local';
export const inMemoryPersistence = 'memory';
const nameOf = app => typeof app === 'string' ? app : app && app.name || DEFAULT;
const storageKey = name => 'fake.auth.' + name + '.user';
function userValue(value) {
  if (!value) return null;
  const user = { ...value };
  user.getIdToken = () => Promise.resolve('fake-id-token-' + user.uid);
  user.getIdTokenResult = () => Promise.resolve({ token: 'fake-id-token-' + user.uid, claims: { email: user.email, email_verified: user.emailVerified, auth_time: user.authTime || Math.floor(Date.now() / 1000) } });
  return user;
}
function read(name) {
  const key = storageKey(name);
  let value = null, persistence = 'local';
  try {
    if (sessionStorage.getItem(key)) { value = JSON.parse(sessionStorage.getItem(key)); persistence = 'session'; }
    else if (localStorage.getItem(key)) value = JSON.parse(localStorage.getItem(key));
    // An explicitly planted old Google login exercises the one-time migration from the default app.
    else if (name === DEFAULT && localStorage.getItem('fake.user') === '1') value = { uid: 'owner', email: 'headchef@test.local', emailVerified: true, isAnonymous: false };
    else if (name === DEFAULT && localStorage.getItem('fake.anon')) value = { uid: localStorage.getItem('fake.anon'), isAnonymous: true };
  } catch (e) {}
  return { user: userValue(value), persistence };
}
function persist(auth) {
  const key = storageKey(auth.app.name), value = auth.currentUser;
  localStorage.removeItem(key); sessionStorage.removeItem(key);
  if (value && auth._persistence !== 'memory') (auth._persistence === 'session' ? sessionStorage : localStorage).setItem(key, JSON.stringify(value));
  if (auth.app.name === DEFAULT) {
    if (value && value.isAnonymous) localStorage.setItem('fake.anon', value.uid);
    else localStorage.removeItem('fake.anon');
    if (value && !value.isAnonymous) localStorage.setItem('fake.user', '1');
    else localStorage.removeItem('fake.user');
  }
}
function changed(auth, value) {
  auth._user = userValue(value); persist(auth);
  auth._callbacks.forEach(cb => cb(auth.currentUser));
  window.dispatchEvent(new Event('fake-auth-changed'));
}
export function getAuth(app = { name: DEFAULT }) {
  const name = nameOf(app);
  if (!auths.has(name)) {
    const saved = read(name);
    auths.set(name, { app: typeof app === 'object' ? app : { name }, _user: saved.user, _persistence: saved.persistence, _callbacks: new Set(),
      get currentUser() { return this._user; }, authStateReady() { return Promise.resolve(); } });
  }
  return auths.get(name);
}
export function onAuthStateChanged(auth, cb) {
  auth._callbacks.add(cb); const timer = setTimeout(() => { if (auth._callbacks.has(cb)) cb(auth.currentUser); }, 5);
  return () => { clearTimeout(timer); auth._callbacks.delete(cb); };
}
export class GoogleAuthProvider {}
export function signInAnonymously(auth = getAuth()) {
  if (window.__fakeNoAnon) return Promise.reject({ code: 'auth/network-request-failed' });
  if (!auth.currentUser || !auth.currentUser.isAnonymous) changed(auth, { uid: 'anon' + Math.random().toString(36).slice(2, 10), isAnonymous: true });
  return Promise.resolve({ user: auth.currentUser });
}
export function signInWithPopup(auth = getAuth()) {
  const user = window.__fakeGoogleUser || { uid: 'owner', email: 'headchef@test.local', emailVerified: true, isAnonymous: false, authTime: Math.floor(Date.now() / 1000) };
  changed(auth, user); return Promise.resolve({ user: auth.currentUser });
}
export function signInWithRedirect(auth = getAuth()) { return signInWithPopup(auth); }
export function signOut(auth = getAuth()) { changed(auth, null); return Promise.resolve(); }
export function updateCurrentUser(auth, user) { changed(auth, user); return Promise.resolve(); }
export function setPersistence(auth, mode) {
  auth._persistence = mode;
  window.__fakePersistence = mode;
  (window.__fakePersistenceByApp ||= {})[auth.app.name] = mode;
  persist(auth); return Promise.resolve();
}
window.__fakeAuthUser = app => getAuth(typeof app === 'string' ? { name: app } : app).currentUser;
window.__fakeUid = app => { const user = window.__fakeAuthUser(app || DEFAULT); return user ? user.uid : ''; };
Object.defineProperty(window, '__fakeUser', { configurable: true,
  get() { const user = getAuth({ name: OWNER }).currentUser; return user && !user.isAnonymous ? user : null; },
  set(value) { changed(getAuth({ name: OWNER }), value); }
});
window.addEventListener('storage', event => {
  for (const auth of auths.values()) {
    if (auth._persistence !== 'local' || !(event.key === null || event.key === storageKey(auth.app.name) || auth.app.name === DEFAULT && event.key === 'fake.anon')) continue;
    const saved = read(auth.app.name); auth._user = saved.user;
    auth._callbacks.forEach(cb => cb(auth.currentUser));
  }
  window.dispatchEvent(new Event('fake-auth-changed'));
});
