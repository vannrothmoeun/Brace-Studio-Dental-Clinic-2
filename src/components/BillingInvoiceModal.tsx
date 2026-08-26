/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash2, DollarSign, Receipt, Percent, ShieldCheck, X } from "lucide-react";
import { QueueItem, ServicePrice, TreatmentItem, TreatmentLifecycle, TreatmentUpdate } from "../types";
import {
  getFirestoreCollection,
  processBillingDirect,
  COLLECTIONS,
} from "../services/firestoreService";

interface BillingInvoiceModalProps {
  item: QueueItem | null;
  onClose: () => void;
  onSuccess: (invoiceNo: string, billingDetails: any) => void;
}

interface RowTracking {
  isTracking: boolean;
  treatmentId: string; // "new" or a specific TLxxxxxx id
  totalCost: number;
  totalVisits: number;
  currentVisit: number;
}

export default function BillingInvoiceModal({ item, onClose, onSuccess }: BillingInvoiceModalProps) {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [selectedItems, setSelectedItems] = useState<TreatmentItem[]>([
    { service: "", desc: "Dental Treatment Done", qty: 1, rate: 0 },
  ]);
  const [rowTrackings, setRowTrackings] = useState<RowTracking[]>([
    { isTracking: false, treatmentId: "new", totalCost: 0, totalVisits: 3, currentVisit: 1 }
  ]);
  const [activePatientTreatments, setActivePatientTreatments] = useState<TreatmentLifecycle[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [depositUsed, setDepositUsed] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "ABA Bank / QR" | "Card">("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch prices catalog from Firestore
  useEffect(() => {
    getFirestoreCollection<ServicePrice>(COLLECTIONS.PRICES).then((data) => {
      setPrices(data.filter((p) => !p.archived));
    });
  }, []);

  // Fetch active patient treatments from Firestore
  useEffect(() => {
    if (!item) return;
    getFirestoreCollection<TreatmentLifecycle>(COLLECTIONS.TREATMENTS).then((data) => {
      const filtered = data.filter((t) => t.patientId === item.patientId && t.status === "Active");
      setActivePatientTreatments(filtered);
    });
  }, [item]);

  if (!item) return null;

  // Add a new treatment item line (max 8)
  const handleAddRow = () => {
    if (selectedItems.length >= 8) {
      alert("វិក្កយបត្រនេះអាចគាំទ្រការបញ្ចូលសេវាកម្មបានត្រឹមតែ ៨ ជួរដេកប៉ុណ្ណោះ។");
      return;
    }
    setSelectedItems([
      ...selectedItems,
      { service: "", desc: "Dental Treatment Done", qty: 1, rate: 0 },
    ]);
    setRowTrackings([
      ...rowTrackings,
      { isTracking: false, treatmentId: "new", totalCost: 0, totalVisits: 3, currentVisit: 1 }
    ]);
  };

  // Remove a treatment item row
  const handleRemoveRow = (index: number) => {
    if (selectedItems.length === 1) return;
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);

    const newTrackings = [...rowTrackings];
    newTrackings.splice(index, 1);
    setRowTrackings(newTrackings);
  };

  // Handle service selection and auto-fill rate
  const handleServiceChange = (index: number, serviceName: string) => {
    const matched = prices.find((p) => p.name === serviceName);
    const defaultRate = matched ? (matched.minPrice !== undefined ? matched.minPrice : matched.price) : 0;
    const newItems = [...selectedItems];
    newItems[index].service = serviceName;
    newItems[index].rate = defaultRate;
    setSelectedItems(newItems);

    const newTrackings = [...rowTrackings];
    if (newTrackings[index]) {
      newTrackings[index].totalCost = defaultRate;
    }
    setRowTrackings(newTrackings);
  };

  const handleTrackingToggle = (index: number, checked: boolean) => {
    const newTrackings = [...rowTrackings];
    if (newTrackings[index]) {
      newTrackings[index].isTracking = checked;
      if (checked && newTrackings[index].totalCost === 0) {
        newTrackings[index].totalCost = selectedItems[index]?.rate || 0;
      }
    }
    setRowTrackings(newTrackings);
  };

  const handleTrackingFieldChange = (index: number, field: keyof RowTracking, value: any) => {
    const newTrackings = [...rowTrackings];
    if (newTrackings[index]) {
      newTrackings[index] = { ...newTrackings[index], [field]: value };
      
      // If user selected an existing treatment lifecycle, auto-populate total cost & visits
      if (field === "treatmentId" && value !== "new") {
        const found = activePatientTreatments.find((t) => t.id === value);
        if (found) {
          newTrackings[index].totalCost = found.totalCost;
          newTrackings[index].totalVisits = found.totalVisits;
          newTrackings[index].currentVisit = (found.currentVisit || 1) + 1;
        }
      }
    }
    setRowTrackings(newTrackings);
  };

  // Calculations
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0
  );
  const discountAmount = (subtotal * (Number(discountPct) || 0)) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount - (Number(depositUsed) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = selectedItems.filter((i) => i.service.trim() !== "");
    if (validItems.length === 0) {
      alert("សូមជ្រើសរើសយ៉ាងហោចណាស់មួយមុខសេវាកម្មព្យាបាល!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Gather treatment lifecycle updates
      const treatmentUpdates: TreatmentUpdate[] = [];
      for (let idx = 0; idx < validItems.length; idx++) {
        const originalIdx = selectedItems.indexOf(validItems[idx]);
        if (originalIdx !== -1 && rowTrackings[originalIdx]?.isTracking) {
          const tracking = rowTrackings[originalIdx];
          const isNew = tracking.treatmentId === "new";
          treatmentUpdates.push({
            treatmentId: isNew ? undefined : tracking.treatmentId,
            serviceName: validItems[idx].service,
            totalCost: Number(tracking.totalCost),
            totalVisits: Number(tracking.totalVisits),
            currentVisit: Number(tracking.currentVisit),
            paidAmount: Number(validItems[idx].rate) * Number(validItems[idx].qty),
            isNew,
          });
        }
      }

      const payload = {
        visitId: item.visitId,
        patientId: item.patientId,
        name: item.name,
        phone: item.phone,
        doctor: item.doctor,
        discountPct,
        depositUsed,
        paymentMethod,
        items: validItems,
        treatmentUpdates,
      };

      // Direct Firestore Billing execution
      const result = await processBillingDirect(payload);

      onSuccess(result.invoiceNo, {
        ...payload,
        invoiceNo: result.invoiceNo,
        subtotal: result.subtotal,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount,
      });
    } catch (error) {
      console.error("Invoice generation error:", error);
      alert("មានកំហុសក្នុងការគិតប្រាក់។");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="billing-modal-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div id="billing-modal-container" className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col my-4">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                គិតប្រាក់ និង ចេញវិក្កយបត្រ
              </h3>
              <p className="text-xs text-slate-400">
                អ្នកជំងឺ: <span className="font-bold text-slate-600">{item.name}</span> | គ្រូពេទ្យ: {item.doctor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Patients profile tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-400 block mb-0.5">លេខកូដអ្នកជំងឺ</span>
              <span className="font-mono font-bold text-slate-700">{item.patientId}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 block mb-0.5">លេខទូរស័ព្ទ</span>
              <span className="font-bold text-slate-700">{item.phone}</span>
            </div>
          </div>

          {/* Treatment items table header & row renderer */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                សេវាកម្មព្យាបាល (រហូតដល់ ៨ មុខសេវាកម្ម)
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                បន្ថែមជួរថ្មី
              </button>
            </div>

            <div className="space-y-3">
              {selectedItems.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Service Dropdown with custom input capability */}
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        មុខសេវា #{idx + 1}
                      </label>
                      <input
                        list={`price-options-${idx}`}
                        type="text"
                        placeholder="ជ្រើសរើស ឬវាយបញ្ចូលឈ្មោះសេវា..."
                        value={row.service}
                        onChange={(e) => handleServiceChange(idx, e.target.value)}
                        required
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <datalist id={`price-options-${idx}`}>
                        {prices.map((p) => (
                          <option key={p.id} value={p.name}>
                            ${p.minPrice ?? p.price} {p.maxPrice && p.maxPrice !== (p.minPrice ?? p.price) ? `- $${p.maxPrice}` : ""} ({p.category})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    {/* Qty */}
                    <div className="col-span-3 sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        ចំនួន (Qty)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={(e) => {
                          const newItems = [...selectedItems];
                          newItems[idx].qty = Math.max(1, Number(e.target.value));
                          setSelectedItems(newItems);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Rate ($) */}
                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        តម្លៃក្នុង១ ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.rate}
                        onChange={(e) => {
                          const newItems = [...selectedItems];
                          newItems[idx].rate = Number(e.target.value);
                          setSelectedItems(newItems);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Total Row */}
                    <div className="col-span-3 sm:col-span-2 text-right">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        សរុប ($)
                      </label>
                      <div className="text-sm font-black font-mono text-slate-800 pt-1">
                        ${((Number(row.qty) || 0) * (Number(row.rate) || 0)).toFixed(2)}
                      </div>
                    </div>

                    {/* Delete row button */}
                    <div className="col-span-2 sm:col-span-1 text-right pt-4">
                      {selectedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-Visit Treatment Plan Toggle (Optional check) */}
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rowTrackings[idx]?.isTracking || false}
                        onChange={(e) => handleTrackingToggle(idx, e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        តាមដានជាគម្រោងព្យាបាលបន្ត (Multi-visit Plan)
                      </span>
                    </label>

                    {rowTrackings[idx]?.isTracking && (
                      <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 bg-blue-50/70 p-2 rounded-xl border border-blue-100 text-[11px]">
                        {/* Choose New or Link Existing */}
                        <select
                          value={rowTrackings[idx]?.treatmentId || "new"}
                          onChange={(e) => handleTrackingFieldChange(idx, "treatmentId", e.target.value)}
                          className="px-2 py-1 bg-white border border-blue-200 rounded-lg font-medium text-slate-700 focus:outline-none"
                        >
                          <option value="new">+ បង្កើតគម្រោងថ្មី (New Plan)</option>
                          {activePatientTreatments.map((t) => (
                            <option key={t.id} value={t.id}>
                              ភ្ជាប់ជាមួយ #{t.id} - {t.serviceName} (នៅសល់ ${t.remainingBalance})
                            </option>
                          ))}
                        </select>

                        {/* Total Plan Cost */}
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">តម្លៃគម្រោងសរុប:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={rowTrackings[idx]?.totalCost || 0}
                            onChange={(e) => handleTrackingFieldChange(idx, "totalCost", Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 bg-white border border-blue-200 rounded-md font-mono font-bold text-center"
                          />
                          <span>$</span>
                        </div>

                        {/* Visit counts */}
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">លើកទី:</span>
                          <input
                            type="number"
                            min="1"
                            value={rowTrackings[idx]?.currentVisit || 1}
                            onChange={(e) => handleTrackingFieldChange(idx, "currentVisit", Number(e.target.value))}
                            className="w-10 px-1 py-0.5 bg-white border border-blue-200 rounded-md text-center"
                          />
                          <span className="text-slate-500">នៃសរុប</span>
                          <input
                            type="number"
                            min="1"
                            value={rowTrackings[idx]?.totalVisits || 3}
                            onChange={(e) => handleTrackingFieldChange(idx, "totalVisits", Number(e.target.value))}
                            className="w-10 px-1 py-0.5 bg-white border border-blue-200 rounded-md text-center"
                          />
                          <span>លើក</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount, Deposit & Payment Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Discount (%) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                បញ្ចុះតម្លៃ (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Deposit Applied */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                កាត់កក់មុន ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={depositUsed}
                onChange={(e) => setDepositUsed(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                វិធីសាស្ត្រទូទាត់ប្រាក់
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="Cash">លុយសុទ្ធ (Cash)</option>
                <option value="ABA Bank / QR">ABA Bank / QR Code</option>
                <option value="Card">កាតឥណទាន (Card)</option>
              </select>
            </div>
          </div>

          {/* Grand Total Summary Box */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>តម្លៃសរុបដើម (Subtotal):</span>
              <span className="font-mono text-slate-200">${subtotal.toFixed(2)}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-xs text-rose-400">
                <span>បញ្ចុះតម្លៃ ({discountPct}%):</span>
                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            {depositUsed > 0 && (
              <div className="flex justify-between text-xs text-amber-400">
                <span>កាត់ប្រាក់កក់:</span>
                <span className="font-mono">-${depositUsed.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-100">ចំនួនទឹកប្រាក់ត្រូវទូទាត់ជាក់ស្តែង:</span>
              <span className="text-xl font-black font-mono text-emerald-400">
                ${grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? "កំពុងកត់ត្រា..." : "បញ្ចប់ & ចេញវិក្កយបត្រ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
