import { emptyActors, validateActors } from "./actors-model.js";
export class ActorStore {
  constructor() {
    this.ready = new Promise((resolve, reject) => {
      const r = indexedDB.open("waypoint-actors", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("projects");
        r.result.createObjectStore("sheets");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    this.queue = Promise.resolve();
  }
  async get(projectId) {
    const db = await this.ready;
    return new Promise((resolve, reject) => {
      const r = db
        .transaction("projects")
        .objectStore("projects")
        .get(projectId);
      r.onsuccess = () => {
        try {
          resolve(r.result ? validateActors(r.result) : emptyActors());
        } catch (e) {
          reject(e);
        }
      };
      r.onerror = () => reject(r.error);
    });
  }
  put(projectId, data) {
    const snapshot = structuredClone(validateActors(data));
    const task = this.queue
      .catch(() => {})
      .then(async () => {
        const db = await this.ready;
        return new Promise((resolve, reject) => {
          const tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").put(snapshot, projectId);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      });
    this.queue = task;
    return task;
  }
  async putSheet(projectId, recordId, file) {
    if (file.size > 15000000) throw Error("PDF limit: 15 MB.");
    const header = new TextDecoder().decode(
      await file.slice(0, 1024).arrayBuffer(),
    );
    if (!header.includes("%PDF-")) throw Error("Choose a PDF file.");
    const id = crypto.randomUUID(),
      db = await this.ready;
    await new Promise((resolve, reject) => {
      const tx = db.transaction("sheets", "readwrite");
      tx.objectStore("sheets").put(
        {
          projectId,
          recordId,
          name: file.name,
          blob: new Blob([file], { type: "application/pdf" }),
        },
        id,
      );
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    return id;
  }
  async getSheet(id) {
    const db = await this.ready;
    return new Promise((resolve, reject) => {
      const r = db.transaction("sheets").objectStore("sheets").get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
}
