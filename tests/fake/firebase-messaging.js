// Stand-in for Firebase Cloud Messaging (phone pushes for order cut-offs, 24 Oct 2026): nothing goes over the network.
// getToken gives a made-up push address; a test can set window.__pushTok, or window.__pushNo for a browser without push.
export function isSupported() { return Promise.resolve(!window.__pushNo); }
export function getMessaging(app) { return { kind: 'messaging', app }; }
export function getToken(m, o) {
  window.__pushGot = (window.__pushGot || 0) + 1;
  window.__pushReg = !!(o && o.serviceWorkerRegistration);
  return Promise.resolve(window.__pushTok || 'fake-push-token-1');
}
export function deleteToken() { window.__pushDeleted = true; return Promise.resolve(true); }
