// Stand-in for Firebase Auth, for the click tests only: one made-up head chef account, and an anonymous sign-in per
// browser (22 Oct 2026, PIN sessions) that keeps its uid across reloads like the real one.
const cbs = [];
let anon = localStorage.getItem('fake.anon') ? { uid: localStorage.getItem('fake.anon'), isAnonymous: true } : null;
function user() { return window.__fakeUser || anon; }
window.__fakeUid = () => { const u = user(); return u ? u.uid : ''; };
export function getAuth() { return { get currentUser() { return user(); } }; }
export function onAuthStateChanged(a, cb) { cbs.push(cb); setTimeout(() => cb(user()), 5); return () => {}; }
export class GoogleAuthProvider {}
// window.__fakeNoAnon: the phone's Firebase sign-in fails, like no signal on a first start
export function signInAnonymously() {
  if (window.__fakeNoAnon) return Promise.reject({ code: 'auth/network-request-failed' });
  if (!anon) { anon = { uid: 'anon' + Math.random().toString(36).slice(2, 10), isAnonymous: true }; localStorage.setItem('fake.anon', anon.uid); }
  setTimeout(() => cbs.forEach(c => c(user())), 0);
  return Promise.resolve({ user: anon });
}
export function signInWithPopup() { window.__fakeUser = { uid: 'owner', email: 'headchef@test.local', emailVerified: true }; localStorage.setItem('fake.user', '1'); cbs.forEach(c => c(user())); return Promise.resolve(); }
export function signInWithRedirect() { return signInWithPopup(); }
export function signOut() { window.__fakeUser = null; anon = null; localStorage.removeItem('fake.user'); localStorage.removeItem('fake.anon'); cbs.forEach(c => c(null)); return Promise.resolve(); }
if (localStorage.getItem('fake.user') === '1') window.__fakeUser = { uid: 'owner', email: 'headchef@test.local', emailVerified: true };

export const browserSessionPersistence = 'session';
export const browserLocalPersistence = 'local';
export function setPersistence(auth, mode) { window.__fakePersistence = mode; return Promise.resolve(); }
