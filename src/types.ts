/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Patient {
  id: string; // PTxxxxxx
  name: string;
  phone: string;
  createdAt: string;
  visitsCount?: number;
}

export type QueueStatus = "Waiting" | "In Treatment" | "Completed" | "Cancelled";

export interface QueueItem {
  rowIndex?: number;
  visitId: string; // VISxxxxxx
  patientId: string;
  name: string;
  phone: string;
  timestamp: string;
  checkInTime: string;
  status: QueueStatus;
  doctor: string;
  treatmentItems?: TreatmentItem[];
  invoiceNo?: string;
  notes?: string;
}

export interface TreatmentItem {
  service: string;
  desc: string;
  qty: number;
  rate: number;
}

export interface ServicePrice {
  id: string;
  name: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  archived?: boolean;
}

export interface SalesRecord {
  txnId: string; // TXNxxxxxx
  patientId: string;
  patientName: string;
  visitId: string;
  amount: number;
  type: "Payment" | "Deposit";
  paymentMethod: "Cash" | "ABA Bank / QR" | "Card";
  date: string;
}

export interface ClinicStats {
  totalPatients: number;
  todayVisits: number;
  todaySales: number;
  avgTicket: number;
  waitingCount: number;
  inTreatmentCount: number;
}

export interface TreatmentLifecycle {
  id: string; // TLxxxxxx
  patientId: string;
  patientName: string;
  phone: string;
  serviceName: string;
  totalCost: number;
  paidAmount: number;
  remainingBalance: number;
  totalVisits: number;
  currentVisit: number;
  lastVisitDate: string; // ISO String
  status: "Active" | "Completed" | "Incomplete";
}

export interface TreatmentUpdate {
  treatmentId?: string;
  serviceName: string;
  totalCost: number;
  totalVisits: number;
  currentVisit: number;
  paidAmount: number;
  isNew: boolean;
}

export interface BillingPayload {
  rowIndex?: number;
  visitId: string;
  patientId: string;
  name: string;
  phone: string;
  doctor: string;
  discountPct: number;
  depositUsed: number;
  paymentMethod: "Cash" | "ABA Bank / QR" | "Card";
  items: TreatmentItem[];
  treatmentUpdates?: TreatmentUpdate[];
}

export interface Appointment {
  id: string; // APxxxxxx
  patientName: string;
  phone: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string;
  doctor?: string;
  notes?: string;
  createdAt: string;
  status: "Scheduled" | "Confirmed" | "Completed" | "Cancelled";
}

