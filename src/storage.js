let database;
function open() {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("offrecord", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("sessions", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = null;
      reject(request.error);
    };
  });
  return database;
}
async function transaction(mode, action) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", mode);
    const request = action(tx.objectStore("sessions"));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? Error("Storage transaction aborted"));
  });
}
export const saveSession = (session) =>
  transaction("readwrite", (store) => store.put(structuredClone(session)));
export const deleteSession = (id) =>
  transaction("readwrite", (store) => store.delete(id));
export const listSessions = async () =>
  (await transaction("readonly", (store) => store.getAll())).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
