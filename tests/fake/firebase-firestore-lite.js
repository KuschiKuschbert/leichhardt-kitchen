// Firestore Lite stand-in. Uses the same synthetic server as the full SDK, with no offline result cache or queue.
export { collection, doc, where, documentId, orderBy, limit, startAfter, query, serverTimestamp, runTransaction } from './firebase-firestore.js';
export { liteGetDoc as getDoc, liteGetDocs as getDocs } from './firebase-firestore.js';
export function getFirestore(app) { return { kind: 'lite-db', app }; }
