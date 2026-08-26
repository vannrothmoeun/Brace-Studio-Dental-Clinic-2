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
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Patient,
  QueueItem,
  ServicePrice,
  SalesRecord,
  TreatmentLifecycle,
  Appointment,
  ClinicStats,
} from "../types";

export const COLLECTIONS = {
  PATIENTS: "patients",
  QUEUE: "queue",
  APPOINTMENTS: "appointments",
  TREATMENTS: "treatments",
  PRICES: "prices",
  SALES: "sales",
};

// Initial Seed Data to auto-populate empty Firestore databases
export const DEFAULT_PRICES: ServicePrice[] = [
  { id: "PR001", name: "Scaling & Polishing", price: 20.0, minPrice: 20.0, maxPrice: 30.0, category: "Preventive" },
  { id: "PR002", name: "Composite Filling", price: 30.0, minPrice: 30.0, maxPrice: 50.0, category: "Restorative" },
  { id: "PR003", name: "Tooth Extraction (Simple)", price: 30.0, minPrice: 30.0, maxPrice: 60.0, category: "Surgical" },
  { id: "PR004", name: "Surgical Tooth Extraction", price: 80.0, minPrice: 80.0, maxPrice: 150.0, category: "Surgical" },
  { id: "PR005", name: "Porcelain Crown", price: 120.0, minPrice: 120.0, maxPrice: 180.0, category: "Prosthetic" },
  { id: "PR006", name: "Zirconia Crown", price: 220.0, minPrice: 220.0, maxPrice: 300.0, category: "Prosthetic" },
  { id: "PR007", name: "Root Canal Treatment", price: 80.0, minPrice: 80.0, maxPrice: 150.0, category: "Endodontic" },
  { id: "PR008", name: "Teeth Whitening (In-Office)", price: 150.0, minPrice: 150.0, maxPrice: 220.0, category: "Cosmetic" },
  { id: "PR009", name: "Dental Implant Consultation", price: 15.0, minPrice: 15.0, maxPrice: 15.0, category: "Consultation" },
  { id: "PR010", name: "Deep Cleaning (Periodontal)", price: 50.0, minPrice: 50.0, maxPrice: 80.0, category: "Preventive" },
];

export const DEFAULT_PATIENTS: Patient[] = [
  {
    id: "PT102431",
    name: "Sopheap Meas",
    phone: "+855 12 345 678",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    visitsCount: 3,
  },
  {
    id: "PT940212",
    name: "Sreyneang Chea",
    phone: "+855 98 765 432",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    visitsCount: 1,
  },
  {
    id: "PT558190",
    name: "Chanravy Sok",
    phone: "+855 15 999 888",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    visitsCount: 2,
  },
  {
    id: "PT401295",
    name: "Vicheka Keo",
    phone: "+855 77 444 333",
    createdAt: new Date().toISOString(),
    visitsCount: 1,
  },
];

export const DEFAULT_QUEUE: QueueItem[] = [
  {
    visitId: "VIS301294",
    patientId: "PT102431",
    name: "Sopheap Meas",
    phone: "+855 12 345 678",
    timestamp: "09:30 AM",
    checkInTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: "Waiting",
    doctor: "Dr. Ly MengKheang",
  },
  {
    visitId: "VIS883012",
    patientId: "PT940212",
    name: "Sreyneang Chea",
    phone: "+855 98 765 432",
    timestamp: "10:15 AM",
    checkInTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: "In Treatment",
    doctor: "Dr. Ly MengKheang",
  },
];

export const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: "AP102431",
    patientName: "Sopheap Meas",
    phone: "+855 12 345 678",
    service: "Root Canal Treatment",
    date: new Date().toISOString().split("T")[0],
    time: "10:00 AM",
    doctor: "Dr. Ly MengKheang",
    notes: "ពិនិត្យតាមដានធ្មេញថ្គាមខាងលើ (Follow-up visit 2)",
    createdAt: new Date().toISOString(),
    status: "Confirmed",
  },
  {
    id: "AP940212",
    patientName: "Sreyneang Chea",
    phone: "+855 98 765 432",
    service: "Scaling & Polishing",
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    time: "02:30 PM",
    doctor: "Dr. Ly MengKheang",
    notes: "កោសកំបោរធ្មេញ និងសម្អាតទូទៅ",
    createdAt: new Date().toISOString(),
    status: "Scheduled",
  },
];

export const DEFAULT_TREATMENTS: TreatmentLifecycle[] = [
  {
    id: "TL401821",
    patientId: "PT102431",
    patientName: "Sopheap Meas",
    phone: "+855 12 345 678",
    serviceName: "Root Canal Treatment",
    totalCost: 90.0,
    paidAmount: 30.0,
    remainingBalance: 60.0,
    totalVisits: 3,
    currentVisit: 1,
    lastVisitDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Active",
  },
  {
    id: "TL992815",
    patientId: "PT940212",
    patientName: "Sreyneang Chea",
    phone: "+855 98 765 432",
    serviceName: "Surgical Tooth Extraction",
    totalCost: 120.0,
    paidAmount: 40.0,
    remainingBalance: 80.0,
    totalVisits: 2,
    currentVisit: 1,
    lastVisitDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Active",
  },
];

export const DEFAULT_SALES: SalesRecord[] = [
  {
    txnId: "TXN401824",
    patientId: "PT102431",
    patientName: "Sopheap Meas",
    visitId: "VIS109204",
    amount: 60.0,
    type: "Payment",
    paymentMethod: "Cash",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    txnId: "TXN992813",
    patientId: "PT558190",
    patientName: "Chanravy Sok",
    visitId: "VIS402910",
    amount: 250.0,
    type: "Payment",
    paymentMethod: "ABA Bank / QR",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper: Ensure initial seed data exists on Firestore
let hasSeeded = false;
export async function ensureFirestoreInitialSeed() {
  if (hasSeeded) return;
  hasSeeded = true;
  try {
    const pricesSnapshot = await getDocs(collection(db, COLLECTIONS.PRICES));
    if (pricesSnapshot.empty) {
      console.log("Seeding initial Firestore database collections...");
      const batch = writeBatch(db);

      DEFAULT_PRICES.forEach((p) => {
        batch.set(doc(db, COLLECTIONS.PRICES, p.id), p);
      });
      DEFAULT_PATIENTS.forEach((pt) => {
        batch.set(doc(db, COLLECTIONS.PATIENTS, pt.id), pt);
      });
      DEFAULT_QUEUE.forEach((q) => {
        batch.set(doc(db, COLLECTIONS.QUEUE, q.visitId), q);
      });
      DEFAULT_APPOINTMENTS.forEach((a) => {
        batch.set(doc(db, COLLECTIONS.APPOINTMENTS, a.id), a);
      });
      DEFAULT_TREATMENTS.forEach((t) => {
        batch.set(doc(db, COLLECTIONS.TREATMENTS, t.id), t);
      });
      DEFAULT_SALES.forEach((s) => {
        batch.set(doc(db, COLLECTIONS.SALES, s.txnId), s);
      });

      await batch.commit();
      console.log("Firestore initial seed completed successfully.");
    }
  } catch (err) {
    console.warn("Firestore seed check notice:", err);
  }
}

// -------------------------------------------------------------
// DIRECT FIRESTORE CRUD OPERATIONS (Works offline & in hosting)
// -------------------------------------------------------------

/**
 * Save / Update a Document
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
 * Delete a Document
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
 * Fetch all documents from a collection
 */
export async function getFirestoreCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      // Return defaults if database is empty initially
      if (collectionName === COLLECTIONS.PRICES) return DEFAULT_PRICES as unknown as T[];
      if (collectionName === COLLECTIONS.PATIENTS) return DEFAULT_PATIENTS as unknown as T[];
      if (collectionName === COLLECTIONS.QUEUE) return DEFAULT_QUEUE as unknown as T[];
      if (collectionName === COLLECTIONS.APPOINTMENTS) return DEFAULT_APPOINTMENTS as unknown as T[];
      if (collectionName === COLLECTIONS.TREATMENTS) return DEFAULT_TREATMENTS as unknown as T[];
      if (collectionName === COLLECTIONS.SALES) return DEFAULT_SALES as unknown as T[];
      return [];
    }
    return snapshot.docs.map((d) => d.data() as T);
  } catch (error) {
    console.warn(`Error getting Firestore collection ${collectionName}:`, error);
    if (collectionName === COLLECTIONS.PRICES) return DEFAULT_PRICES as unknown as T[];
    if (collectionName === COLLECTIONS.PATIENTS) return DEFAULT_PATIENTS as unknown as T[];
    if (collectionName === COLLECTIONS.QUEUE) return DEFAULT_QUEUE as unknown as T[];
    if (collectionName === COLLECTIONS.APPOINTMENTS) return DEFAULT_APPOINTMENTS as unknown as T[];
    if (collectionName === COLLECTIONS.TREATMENTS) return DEFAULT_TREATMENTS as unknown as T[];
    if (collectionName === COLLECTIONS.SALES) return DEFAULT_SALES as unknown as T[];
    return [];
  }
}

/**
 * Subscribe to Real-Time Updates
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
        if (!snapshot.empty) {
          const items = snapshot.docs.map((d) => d.data() as T);
          onUpdate(items);
        } else {
          // Empty collection
          onUpdate([]);
        }
      },
      (err) => {
        console.warn(`Firestore subscription notice for ${collectionName}:`, err.message);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn(`Failed to initialize snapshot for ${collectionName}:`, err);
    return () => {};
  }
}

/**
 * Patient Check-in Direct to Firestore
 */
export async function checkInPatientDirect(patientData: {
  name: string;
  phone: string;
  doctor: string;
  patientId?: string;
}): Promise<{ visitId: string; patient: Patient; queueItem: QueueItem }> {
  // 1. Resolve Patient ID
  let patientId = patientData.patientId;
  let patientName = patientData.name.trim();
  let patientPhone = patientData.phone.trim();

  // Search existing or create new patient
  if (!patientId) {
    const patients = await getFirestoreCollection<Patient>(COLLECTIONS.PATIENTS);
    const existing = patients.find(
      (p) =>
        p.phone === patientPhone ||
        p.name.toLowerCase() === patientName.toLowerCase()
    );
    if (existing) {
      patientId = existing.id;
      patientName = existing.name;
      patientPhone = existing.phone;
      // Increment visit count
      await saveToFirestore(COLLECTIONS.PATIENTS, {
        ...existing,
        visitsCount: (existing.visitsCount || 1) + 1,
      });
    } else {
      patientId = `PT${Math.floor(100000 + Math.random() * 900000)}`;
      const newPatient: Patient = {
        id: patientId,
        name: patientName,
        phone: patientPhone,
        createdAt: new Date().toISOString(),
        visitsCount: 1,
      };
      await saveToFirestore(COLLECTIONS.PATIENTS, newPatient);
    }
  }

  // 2. Create Queue Item
  const visitId = `VIS${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date();
  const hours = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const timestamp = `${String(formattedHours).padStart(2, "0")}:${mins} ${ampm}`;

  const queueItem: QueueItem = {
    visitId,
    patientId: patientId!,
    name: patientName,
    phone: patientPhone,
    timestamp,
    checkInTime: now.toISOString(),
    status: "Waiting",
    doctor: patientData.doctor || "Dr. Ly MengKheang",
  };

  await saveToFirestore(COLLECTIONS.QUEUE, queueItem);

  const patientObj: Patient = {
    id: patientId!,
    name: patientName,
    phone: patientPhone,
    createdAt: new Date().toISOString(),
  };

  return { visitId, patient: patientObj, queueItem };
}

/**
 * Process Billing & Invoice Direct to Firestore
 */
export async function processBillingDirect(payload: {
  visitId: string;
  patientId: string;
  name: string;
  phone: string;
  doctor: string;
  discountPct: number;
  depositUsed: number;
  paymentMethod: string;
  items: any[];
  treatmentUpdates: any[];
}) {
  const invoiceNo = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const txnId = `TXN${Math.floor(100000 + Math.random() * 900000)}`;

  const subtotal = payload.items.reduce(
    (sum, item) => sum + (Number(item.rate) || 0) * (Number(item.qty) || 1),
    0
  );
  const discountAmount = (subtotal * (Number(payload.discountPct) || 0)) / 100;
  const finalAmount = Math.max(0, subtotal - discountAmount - (Number(payload.depositUsed) || 0));

  // 1. Update Queue Item
  await saveToFirestore(COLLECTIONS.QUEUE, {
    visitId: payload.visitId,
    status: "Completed",
    invoiceNo,
    treatmentItems: payload.items,
    completedAt: new Date().toISOString(),
  });

  // 2. Add Sales Record
  const validMethod = (payload.paymentMethod === "ABA Bank / QR" || payload.paymentMethod === "Card" ? payload.paymentMethod : "Cash") as "Cash" | "ABA Bank / QR" | "Card";
  const saleRecord: SalesRecord = {
    txnId,
    patientId: payload.patientId,
    patientName: payload.name,
    visitId: payload.visitId,
    amount: finalAmount,
    type: "Payment",
    paymentMethod: validMethod,
    date: new Date().toISOString(),
  };
  await saveToFirestore(COLLECTIONS.SALES, saleRecord);

  // 3. Process Treatment Lifecycle Updates
  if (payload.treatmentUpdates && payload.treatmentUpdates.length > 0) {
    for (const update of payload.treatmentUpdates) {
      if (update.isNew) {
        const newTreatmentId = `TL${Math.floor(100000 + Math.random() * 900000)}`;
        const totalCost = Number(update.totalCost) || 0;
        const paidAmount = Number(update.paidAmount) || 0;
        const remainingBalance = Math.max(0, totalCost - paidAmount);
        const status = remainingBalance <= 0 || update.currentVisit >= update.totalVisits ? "Completed" : "Active";

        const newTreatment: TreatmentLifecycle = {
          id: newTreatmentId,
          patientId: payload.patientId,
          patientName: payload.name,
          phone: payload.phone,
          serviceName: update.serviceName,
          totalCost,
          paidAmount,
          remainingBalance,
          totalVisits: Number(update.totalVisits) || 3,
          currentVisit: Number(update.currentVisit) || 1,
          lastVisitDate: new Date().toISOString(),
          status,
        };
        await saveToFirestore(COLLECTIONS.TREATMENTS, newTreatment);
      } else if (update.treatmentId) {
        // Fetch and update existing
        const allTreatments = await getFirestoreCollection<TreatmentLifecycle>(COLLECTIONS.TREATMENTS);
        const existing = allTreatments.find((t) => t.id === update.treatmentId);
        if (existing) {
          const paidAmount = (existing.paidAmount || 0) + (Number(update.paidAmount) || 0);
          const totalCost = Number(update.totalCost) || existing.totalCost;
          const remainingBalance = Math.max(0, totalCost - paidAmount);
          const currentVisit = Number(update.currentVisit) || (existing.currentVisit + 1);
          const totalVisits = Number(update.totalVisits) || existing.totalVisits;
          const status = remainingBalance <= 0 || currentVisit >= totalVisits ? "Completed" : "Active";

          await saveToFirestore(COLLECTIONS.TREATMENTS, {
            ...existing,
            paidAmount,
            totalCost,
            remainingBalance,
            currentVisit,
            totalVisits,
            lastVisitDate: new Date().toISOString(),
            status,
          });
        }
      }
    }
  }

  return {
    invoiceNo,
    txnId,
    subtotal,
    discountAmount,
    finalAmount,
  };
}
