/**
 * chatDB.ts — IndexedDB cache for instant_chat_messages
 *
 * Strategy (WhatsApp-style):
 * - On first load: fetch all messages from Supabase, store in IndexedDB
 * - On subsequent polls: only fetch messages WHERE created_at > last_stored_timestamp
 * - Realtime INSERT: append directly to IndexedDB + UI (no DB query needed)
 * - Result: 0 to 2 rows fetched per poll instead of 200+
 */

const DB_NAME    = "doctor_chat_db";
const DB_VERSION = 1;
const STORE      = "messages";

// ── Open / init DB ─────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db    = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("by_session",         "session_id",              { unique: false });
        store.createIndex("by_session_created", ["session_id","created_at"], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Save messages (upsert) ─────────────────────────────────────────────────
export async function saveMessages(messages: any[]): Promise<void> {
  if (!messages.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    messages.forEach((m) => store.put(m));
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Get all messages for a session (sorted by created_at) ─────────────────
export async function getMessages(sessionId: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE, "readonly");
    const index   = tx.objectStore(STORE).index("by_session");
    const req     = index.getAll(IDBKeyRange.only(sessionId));
    req.onsuccess = () => {
      const sorted = (req.result as any[]).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      resolve(sorted);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Get the latest created_at for a session (for delta fetching) ───────────
export async function getLastMessageTime(sessionId: string): Promise<string | null> {
  const messages = await getMessages(sessionId);
  if (!messages.length) return null;
  return messages[messages.length - 1].created_at;
}

// ── Append a single message (used by realtime INSERT handler) ──────────────
export async function appendMessage(message: any): Promise<void> {
  await saveMessages([message]);
}

// ── Clear messages for a session (on session end) ─────────────────────────
export async function clearSession(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const index = tx.objectStore(STORE).index("by_session");
    const req   = index.openCursor(IDBKeyRange.only(sessionId));
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
