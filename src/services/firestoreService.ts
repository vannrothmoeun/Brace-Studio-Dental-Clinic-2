/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseConfig } from "../firebase";
import { Patient, QueueItem, ServicePrice, SalesRecord, TreatmentLifecycle, Appointment } from "../types";

export interface SyncStatus {
  connected: boolean;
  lastSyncedAt: Date | null;
  syncing: boolean;
  error: string | null;
}

// Collections mapping
export const COLLECTIONS = {
  PATIENTS: "patients",
  QUEUE: "queue",
  APPOINTMENTS: "appointments",
  TREATMENTS: "treatments",
  PRICES: "prices",
  SALES: "sales",
};

/**
 * Save single document to Firestore
 */
export async function saveToFirestore<T extends { id?: string; visitId?: string; txnId?: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  try {
    const docId = data.id || data.visitId || data.txnId;
    if (!docId) {
      throw new Error("Document must have an id, visitId, or txnId");
    }
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error(`Error saving to Firestore collection ${collectionName}:`, error);
  }
}

/**
 * Delete document from Firestore
 */
export async function deleteFromFirestore(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting from Firestore collection ${collectionName}:`, error);
  }
}

/**
 * Sync entire dataset from local server to Firebase Firestore
 */
export async function syncLocalToFirestore(): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch from server API
    const [queueRes, salesRes, treatmentsRes, appointmentsRes, pricesRes, patientsRes] = await Promise.all([
      fetch("/api/queue"),
      fetch("/api/sales"),
      fetch("/api/treatments"),
      fetch("/api/appointments"),
      fetch("/api/prices"),
      fetch("/api/patients"),
    ]);

    const queue: QueueItem[] = queueRes.ok ? await queueRes.json() : [];
    const salesData = salesRes.ok ? await salesRes.json() : { ledger: [] };
    const sales: SalesRecord[] = salesData.ledger || [];
    const treatments: TreatmentLifecycle[] = treatmentsRes.ok ? await treatmentsRes.json() : [];
    const appointments: Appointment[] = appointmentsRes.ok ? await appointmentsRes.json() : [];
    const prices: ServicePrice[] = pricesRes.ok ? await pricesRes.json() : [];
    const patients: Patient[] = patientsRes.ok ? await patientsRes.json() : [];

    // 2. Batch push to Firestore
    const promises: Promise<void>[] = [];

    queue.forEach((item) => {
      promises.push(saveToFirestore(COLLECTIONS.QUEUE, item));
    });

    sales.forEach((record) => {
      promises.push(saveToFirestore(COLLECTIONS.SALES, record));
    });

    treatments.forEach((t) => {
      promises.push(saveToFirestore(COLLECTIONS.TREATMENTS, t));
    });

    appointments.forEach((a) => {
      promises.push(saveToFirestore(COLLECTIONS.APPOINTMENTS, a));
    });

    prices.forEach((p) => {
      promises.push(saveToFirestore(COLLECTIONS.PRICES, p));
    });

    patients.forEach((pt) => {
      promises.push(saveToFirestore(COLLECTIONS.PATIENTS, pt));
    });

    await Promise.all(promises);
    return { success: true };
  } catch (err: any) {
    console.error("Firestore sync error:", err);
    return { success: false, error: err?.message || "Unknown Firestore error" };
  }
}

/**
 * Setup Realtime Listeners for Firestore
 */
export function subscribeToFirestoreCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as T);
        onUpdate(items);
      },
      (err) => {
        console.warn(`Firestore subscription listener warning for ${collectionName}:`, err.message);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn(`Failed to initialize snapshot for ${collectionName}:`, err);
    return () => {};
  }
}
