/* Firebase web app settings for the prep list. These values are meant to be public. They only say which
   project to talk to. Who can read or write is decided by the security rules in the Firebase console. */
window.LK_FIREBASE = {
  apiKey: 'AIzaSyDKnqjVhe4U_mCaOCeqbiQqcazEiezRJT4',
  authDomain: 'leichhardt-kitchen.firebaseapp.com',
  projectId: 'leichhardt-kitchen',
  storageBucket: 'leichhardt-kitchen.firebasestorage.app',
  messagingSenderId: '674594425985',
  appId: '1:674594425985:web:4e545f61102189329ad180',
  // App Check (Fraud Defense, reCAPTCHA Enterprise): the site key is public too. With it every phone sends a token that
  // says the request came from the real site; once Enforce is on in the Firebase console, nothing else gets through.
  appCheckEnterpriseKey: '6LfIyfYtAAAAAGhFk-Cbb2biycRCkCD3uhAQcbvT'
};
