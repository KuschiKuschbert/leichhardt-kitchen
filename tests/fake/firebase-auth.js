// Stand-in for Firebase Auth, for the click tests only: one made-up head chef account.
const cbs = [];
function user() { return window.__fakeUser || null; }
export function getAuth() { return {}; }
export function onAuthStateChanged(a, cb) { cbs.push(cb); setTimeout(() => cb(user()), 5); return () => {}; }
export class GoogleAuthProvider {}
export function signInWithPopup() { window.__fakeUser = { email: 'headchef@test.local', emailVerified: true }; localStorage.setItem('fake.user', '1'); cbs.forEach(c => c(user())); return Promise.resolve({ user: user() }); }
export function signInWithRedirect() { return signInWithPopup(); }
export function signOut() { window.__fakeUser = null; localStorage.removeItem('fake.user'); cbs.forEach(c => c(null)); return Promise.resolve(); }
if (localStorage.getItem('fake.user') === '1') window.__fakeUser = { email: 'headchef@test.local', emailVerified: true };
