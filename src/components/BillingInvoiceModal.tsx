/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash2, DollarSign, Receipt, Percent, ShieldCheck, X } from "lucide-react";
import { QueueItem, ServicePrice, TreatmentItem, TreatmentLifecycle, TreatmentUpdate } from "../types";

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

  // Fetch prices catalog
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/prices");
        if (res.ok) {
          const data = await res.json();
          setPrices(data);
        }
      } catch (err) {
        console.error("Failed to load prices catalog:", err);
      }
    }
    fetchPrices();
  }, []);

  // Fetch active patient treatments
  useEffect(() => {
    async function fetchPatientTreatments() {
      if (!item) return;
      try {
        const res = await fetch("/api/treatments");
        if (res.ok) {
          const data: TreatmentLifecycle[] = await res.json();
          const filtered = data.filter((t) => t.patientId === item.patientId && t.status === "Active");
          setActivePatientTreatments(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch treatments:", err);
      }
    }
    fetchPatientTreatments();
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
      if (checked) {
        const matchedService = prices.find(p => p.name === selectedItems[index].service);
        newTrackings[index].totalCost = matchedService ? matchedService.price : selectedItems[index].rate;
      }
    }
    setRowTrackings(newTrackings);
  };

  const handleTrackingValueChange = (index: number, field: keyof RowTracking, value: any) => {
    const newTrackings = [...rowTrackings];
    if (newTrackings[index]) {
      newTrackings[index] = {
        ...newTrackings[index],
        [field]: field === "isTracking" ? !!value : value
      };

      // If they selected an existing treatment plan, populate values from it!
      if (field === "treatmentId" && value !== "new") {
        const existing = activePatientTreatments.find(t => t.id === value);
        if (existing) {
          newTrackings[index].totalCost = existing.totalCost;
          newTrackings[index].totalVisits = existing.totalVisits;
          newTrackings[index].currentVisit = existing.currentVisit + 1;
        }
      } else if (field === "treatmentId" && value === "new") {
        const matchedService = prices.find(p => p.name === selectedItems[index].service);
        newTrackings[index].totalCost = matchedService ? matchedService.price : selectedItems[index].rate;
        newTrackings[index].totalVisits = 3;
        newTrackings[index].currentVisit = 1;
      }
    }
    setRowTrackings(newTrackings);
  };

  // Handle item input modifications (qty, rate, desc)
  const handleItemValueChange = (index: number, field: keyof TreatmentItem, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = {
      ...newItems[index],
      [field]: field === "qty" || field === "rate" ? Number(value) : value,
    };
    setSelectedItems(newItems);
  };

  // Real-time invoice computations
  const getSubtotal = () => {
    return selectedItems.reduce((acc, current) => acc + current.rate * current.qty, 0);
  };

  const getDiscountAmt = () => {
    return getSubtotal() * (discountPct / 100);
  };

  const getBalanceDue = () => {
    const net = getSubtotal() - getDiscountAmt() - depositUsed;
    return Math.max(0, net);
  };

  // Submit billing to complete treatment and generate invoice
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter empty lines
    const validItems = selectedItems.filter((i) => i.service !== "");
    if (validItems.length === 0) {
      alert("សូមជ្រើសរើសសេវាកម្មព្យាបាលយ៉ាងហោចណាស់មួយ!");
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

      const response = await fetch("/api/billing/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        onSuccess(result.invoiceNo, {
          ...payload,
          invoiceNo: result.invoiceNo,
          subtotal: result.subtotal,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
        });
      } else {
        alert("មិនអាចកត់ត្រាប្រតិបត្តិការ និងបញ្ចប់ការទូទាត់ប្រាក់បានទេ។");
      }
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
                <Plus className="w-4 h-4" />
                បន្ថែមសេវាកម្ម
              </button>
            </div>

            <div className="space-y-3">
              {selectedItems.map((selectedItem, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/30 hover:bg-slate-50/50 border border-slate-200 rounded-2xl transition space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    {/* Select Service catalog */}
                    <div className="md:col-span-5">
                      <select
                        value={selectedItem.service}
                        onChange={(e) => handleServiceChange(idx, e.target.value)}
                        required
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- ជ្រើសរើសសេវាកម្ម --</option>
                        {prices.filter((p) => !p.archived).map((p) => {
                          const min = p.minPrice !== undefined ? p.minPrice : p.price;
                          const max = p.maxPrice !== undefined ? p.maxPrice : p.price;
                          const rangeLabel = min !== max 
                            ? `$${min.toFixed(2)} – $${max.toFixed(2)}` 
                            : `$${min.toFixed(2)}`;
                          return (
                            <option key={p.id} value={p.name}>
                              {p.name} ({rangeLabel})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Quantity input */}
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        placeholder="ចំនួន"
                        min="1"
                        value={selectedItem.qty}
                        onChange={(e) => handleItemValueChange(idx, "qty", e.target.value)}
                        required
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs text-center focus:outline-hidden bg-white text-slate-700 font-bold"
                      />
                    </div>

                    {/* Rate / price input */}
                    <div className="md:col-span-2 relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        placeholder="តម្លៃ"
                        min="0"
                        step="0.01"
                        value={selectedItem.rate}
                        onChange={(e) => handleItemValueChange(idx, "rate", e.target.value)}
                        required
                        className="w-full pl-6 pr-2 py-2 border border-slate-200 rounded-lg text-xs text-center focus:outline-hidden bg-white text-slate-800 font-bold font-mono"
                      />
                    </div>

                    {/* Row Subtotal Calculation */}
                    <div className="md:col-span-2 font-mono text-xs font-bold text-slate-800 text-center">
                      ${(selectedItem.qty * selectedItem.rate).toFixed(2)}
                    </div>

                    {/* Delete row */}
                    <div className="md:col-span-1 text-right">
                      <button
                        type="button"
                        disabled={selectedItems.length === 1}
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price Range Recommendation Pill if service has range */}
                  {(() => {
                    const matched = prices.find((p) => p.name === selectedItem.service);
                    if (matched) {
                      const min = matched.minPrice !== undefined ? matched.minPrice : matched.price;
                      const max = matched.maxPrice !== undefined ? matched.maxPrice : matched.price;
                      if (min !== max) {
                        return (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/70 border border-blue-100 rounded-lg text-[10px] text-blue-700">
                            <span className="font-bold">💡 ចន្លោះតម្លៃណែនាំ:</span>
                            <span className="font-mono font-bold">${min.toFixed(2)} – ${max.toFixed(2)}</span>
                            <span className="text-slate-500">(លោកគ្រូអាចកែប្រែតម្លៃជាក់ស្ដែងតាមស្ថានភាពធ្មេញ)</span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Multi-visit checkbox */}
                  {selectedItem.service && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col">
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rowTrackings[idx]?.isTracking || false}
                          onChange={(e) => handleTrackingToggle(idx, e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5"
                        />
                        <span>តាមដានវគ្គការព្យាបាល (Multi-visit Lifecycle Tracking)</span>
                      </label>

                      {rowTrackings[idx]?.isTracking && (
                        <div className="mt-2.5 bg-blue-50/50 border border-blue-100 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                          {/* Plan type dropdown */}
                          <div className="sm:col-span-4">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">គម្រោងការព្យាបាល</label>
                            <select
                              value={rowTrackings[idx]?.treatmentId || "new"}
                              onChange={(e) => handleTrackingValueChange(idx, "treatmentId", e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-700 focus:outline-none"
                            >
                              <option value="new">+ បង្កើតគម្រោងថ្មី (New Treatment)</option>
                              {activePatientTreatments.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.serviceName} ({t.id}) - បង់បាន ${t.paidAmount}/${t.totalCost} (លើកទី {t.currentVisit}/{t.totalVisits})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Total Cost package */}
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">តម្លៃកញ្ចប់សរុប ($)</label>
                            <input
                              type="number"
                              value={rowTrackings[idx]?.totalCost || 0}
                              onChange={(e) => handleTrackingValueChange(idx, "totalCost", Number(e.target.value))}
                              className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] text-center bg-white text-slate-700 focus:outline-none"
                            />
                          </div>

                          {/* Total Visits required */}
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">ចំនួនដងសរុប</label>
                            <input
                              type="number"
                              min="1"
                              value={rowTrackings[idx]?.totalVisits || 3}
                              onChange={(e) => handleTrackingValueChange(idx, "totalVisits", Number(e.target.value))}
                              className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] text-center bg-white text-slate-700 focus:outline-none"
                            />
                          </div>

                          {/* Current Visit number */}
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">ជំនួបលើកទី</label>
                            <input
                              type="number"
                              min="1"
                              value={rowTrackings[idx]?.currentVisit || 1}
                              onChange={(e) => handleTrackingValueChange(idx, "currentVisit", Number(e.target.value))}
                              className="w-full p-1.5 border border-slate-200 rounded-lg text-[11px] text-center bg-white text-slate-700 focus:outline-none"
                            />
                          </div>

                          {/* Remaining Balance estimation */}
                          <div className="sm:col-span-2 flex flex-col justify-center items-center">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">សមតុល្យនៅសល់</span>
                            <span className="font-mono text-xs font-bold text-blue-600">
                              ${Math.max(0, (rowTrackings[idx]?.totalCost || 0) - (
                                (rowTrackings[idx]?.treatmentId !== "new" 
                                  ? activePatientTreatments.find(t => t.id === rowTrackings[idx].treatmentId)?.paidAmount || 0 
                                  : 0) 
                                + (selectedItem.qty * selectedItem.rate || 0)
                              )).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Checkout adjustments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-violet-500" />
                បញ្ចុះតម្លៃ %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-xs text-center text-slate-700 bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* Deposit */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                ប្រាក់កក់កាត់កង
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={depositUsed}
                onChange={(e) => setDepositUsed(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-xs text-center text-slate-700 bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                វិធីសាស្ត្រទូទាត់
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-xs text-slate-700 bg-white"
              >
                <option value="Cash">លុយសុទ្ធ</option>
                <option value="ABA Bank / QR">ABA Bank / QR Code</option>
                <option value="Card">កាតឥណទាន</option>
              </select>
            </div>
          </div>

          {/* Mathematical calculation panel */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col space-y-2.5 font-sans">
            <div className="flex justify-between text-xs text-slate-500">
              <span>ប្រាក់សរុប/Total:</span>
              <span className="font-mono font-bold">${getSubtotal().toFixed(2)}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-xs text-violet-600 font-medium">
                <span>បញ្ចុះតម្លៃ ({discountPct}%):</span>
                <span className="font-mono font-bold">-${getDiscountAmt().toFixed(2)}</span>
              </div>
            )}
            {depositUsed > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-medium">
                <span>ប្រាក់កក់/Deposit:</span>
                <span className="font-mono font-bold">-${depositUsed.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-850 pt-2.5 border-t border-slate-200">
              <span>ប្រាក់នៅខ្វះ/Balance:</span>
              <span className="font-mono text-base text-blue-600">${getBalanceDue().toFixed(2)}</span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-xs hover:shadow-md transition duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            បង្កើតវិក្កយបត្រ
          </button>
        </div>
      </div>
    </div>
  );
}
