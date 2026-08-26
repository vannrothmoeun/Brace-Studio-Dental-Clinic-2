/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Clock,
  Search,
  Edit2,
  DollarSign,
  User,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";
import { TreatmentLifecycle } from "../types";
import {
  getFirestoreCollection,
  saveToFirestore,
  deleteFromFirestore,
  COLLECTIONS,
} from "../services/firestoreService";

export default function TreatmentLifecyclePanel() {
  const [treatments, setTreatments] = useState<TreatmentLifecycle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [daysFilter, setDaysFilter] = useState<number>(0); // 0 means all incomplete
  const [statusFilter, setStatusFilter] = useState<string>("Active"); // "Active", "Completed", "All"
  const [isLoading, setIsLoading] = useState(false);

  // States for editing a treatment plan
  const [editingTreatment, setEditingTreatment] = useState<TreatmentLifecycle | null>(null);
  const [editCurrentVisit, setEditCurrentVisit] = useState<number>(1);
  const [editTotalVisits, setEditTotalVisits] = useState<number>(3);
  const [editTotalCost, setEditTotalCost] = useState<number>(0);
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>("Active");

  // State for adding a manual treatment
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPatientId, setAddPatientId] = useState("");
  const [addPatientName, setAddPatientName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addServiceName, setAddServiceName] = useState("");
  const [addTotalCost, setAddTotalCost] = useState<number>(100);
  const [addPaidAmount, setAddPaidAmount] = useState<number>(0);
  const [addTotalVisits, setAddTotalVisits] = useState<number>(3);

  const fetchTreatments = async () => {
    setIsLoading(true);
    try {
      const data = await getFirestoreCollection<TreatmentLifecycle>(COLLECTIONS.TREATMENTS);
      setTreatments(data);
    } catch (err) {
      console.error("Failed to load treatments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  // Helper: compute days between last visit and today
  const getDaysSinceLastVisit = (dateStr: string) => {
    const lastDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter & Search treatments
  const filteredTreatments = treatments.filter((t) => {
    // 1. Status filter
    if (statusFilter !== "All" && t.status !== statusFilter) {
      return false;
    }

    // 2. Days Filter (Incomplete/Active treatments whose last visit was over X days ago)
    if (daysFilter > 0) {
      if (t.status !== "Active") return false;
      const days = getDaysSinceLastVisit(t.lastVisitDate);
      if (days < daysFilter) return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.patientName.toLowerCase().includes(q);
      const matchPhone = t.phone.includes(q);
      const matchService = t.serviceName.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q) || t.patientId.toLowerCase().includes(q);
      return matchName || matchPhone || matchService || matchId;
    }

    return true;
  });

  // Start editing a treatment
  const handleStartEdit = (t: TreatmentLifecycle) => {
    setEditingTreatment(t);
    setEditCurrentVisit(t.currentVisit);
    setEditTotalVisits(t.totalVisits);
    setEditTotalCost(t.totalCost);
    setEditPaidAmount(t.paidAmount || 0);
    setEditStatus(t.status);
  };

  // Submit treatment updates
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreatment) return;

    try {
      const remainingBalance = Math.max(0, editTotalCost - editPaidAmount);
      const updatedStatus = remainingBalance <= 0 || editCurrentVisit >= editTotalVisits ? "Completed" : editStatus;

      await saveToFirestore(COLLECTIONS.TREATMENTS, {
        ...editingTreatment,
        currentVisit: editCurrentVisit,
        totalVisits: editTotalVisits,
        totalCost: editTotalCost,
        paidAmount: editPaidAmount,
        remainingBalance,
        status: updatedStatus,
        lastVisitDate: new Date().toISOString(),
      });

      setEditingTreatment(null);
      fetchTreatments();
    } catch (err) {
      console.error(err);
      alert("កំហុសក្នុងការកែប្រែ។");
    }
  };

  // Create manual treatment
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPatientName || !addServiceName) {
      alert("សូមបំពេញព័ត៌មានចាំបាច់ឲ្យបានគ្រប់គ្រាន់!");
      return;
    }

    try {
      const id = `TL${Math.floor(100000 + Math.random() * 900000)}`;
      const pId = addPatientId || `PT${Math.floor(100000 + Math.random() * 900000)}`;
      const remainingBalance = Math.max(0, addTotalCost - addPaidAmount);

      const newTreatment: TreatmentLifecycle = {
        id,
        patientId: pId,
        patientName: addPatientName.trim(),
        phone: addPhone.trim(),
        serviceName: addServiceName.trim(),
        totalCost: addTotalCost,
        paidAmount: addPaidAmount,
        remainingBalance,
        totalVisits: addTotalVisits,
        currentVisit: 1,
        lastVisitDate: new Date().toISOString(),
        status: "Active",
      };

      await saveToFirestore(COLLECTIONS.TREATMENTS, newTreatment);

      setShowAddModal(false);
      setAddPatientId("");
      setAddPatientName("");
      setAddPhone("");
      setAddServiceName("");
      setAddTotalCost(100);
      setAddPaidAmount(0);
      setAddTotalVisits(3);
      fetchTreatments();
    } catch (err) {
      console.error(err);
      alert("មិនអាចបង្កើតគម្រោងព្យាបាលថ្មីបានទេ។");
    }
  };

  return (
    <div id="treatment-lifecycle-container" className="space-y-6">
      {/* 1. Header Banner & Quick Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              📋 តាមដានវដ្តជីវិតនៃការព្យាបាល (Treatment Lifecycle)
            </h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Multi-Visit Tracking
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            តាមដានវឌ្ឍនភាពនៃការមកព្យាបាលបន្ត និងសមតុល្យបង់ប្រាក់នៅសល់របស់អ្នកជំងឺ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ បង្កើតគម្រោងថ្មី</span>
          </button>
          <button
            onClick={fetchTreatments}
            className="text-xs text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span>ផ្ទុកឡើងវិញ</span>
          </button>
        </div>
      </div>

      {/* 2. Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះ, លេខទូរស័ព្ទ, ឬកូដ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(["Active", "Completed", "All"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 font-bold rounded-lg transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st === "Active" ? "កំពុងដំណើរការ" : st === "Completed" ? "បានបញ្ចប់" : "ទាំងអស់"}
              </button>
            ))}
          </div>

          {/* Days filter */}
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value={0}>កាលបរិច្ឆេទទាំងអស់</option>
            <option value={7}>ខកខានលើសពី ៧ ថ្ងៃ</option>
            <option value={14}>ខកខានលើសពី ១៤ ថ្ងៃ</option>
            <option value={30}>ខកខានលើសពី ៣០ ថ្ងៃ</option>
          </select>
        </div>
      </div>

      {/* 3. Treatments List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTreatments.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs">
            ពុំមានទិន្នន័យគម្រោងព្យាបាលដែលត្រូវនឹងការស្វែងរកនេះឡើយ។
          </div>
        ) : (
          filteredTreatments.map((t) => {
            const daysSince = getDaysSinceLastVisit(t.lastVisitDate);
            const isCompleted = t.status === "Completed";
            const progressPct = Math.min(100, Math.round((t.currentVisit / t.totalVisits) * 100));

            return (
              <div
                key={t.id}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">
                        {t.id} • {t.patientId}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">{t.patientName}</h4>
                      <p className="text-xs text-slate-400 font-mono">{t.phone}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {isCompleted ? "បានបញ្ចប់" : "កំពុងដំណើរការ"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl space-y-2 mb-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{t.serviceName}</span>
                      <span className="font-mono font-bold text-blue-600">
                        លើកទី {t.currentVisit} / {t.totalVisits}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>បានបង់: <strong className="text-emerald-600">${t.paidAmount || 0}</strong></span>
                      <span>នៅសល់: <strong className="text-rose-600">${t.remainingBalance || 0}</strong></span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      មកចុងក្រោយ: {daysSince === 0 ? "ថ្ងៃនេះ" : `មុននេះ ${daysSince} ថ្ងៃ`}
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      សរុប ${t.totalCost}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    onClick={() => handleStartEdit(t)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    កែសម្រួល
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`តើអ្នកពិតជាចង់លុបគម្រោង ${t.id} នេះមែនទេ?`)) {
                        await deleteFromFirestore(COLLECTIONS.TREATMENTS, t.id);
                        fetchTreatments();
                      }
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingTreatment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3">
              កែប្រែគម្រោង #{editingTreatment.id} - {editingTreatment.patientName}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">លើកទីបច្ចុប្បន្ន</label>
                  <input
                    type="number"
                    min="1"
                    value={editCurrentVisit}
                    onChange={(e) => setEditCurrentVisit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ចំនួនលើកសរុប</label>
                  <input
                    type="number"
                    min="1"
                    value={editTotalVisits}
                    onChange={(e) => setEditTotalVisits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">តម្លៃសរុប ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTotalCost}
                    onChange={(e) => setEditTotalCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">បានបង់រួច ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">ស្ថានភាព</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="Active">Active (កំពុងដំណើរការ)</option>
                  <option value="Completed">Completed (បានបញ្ចប់)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTreatment(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Manual Treatment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3">
              + បង្កើតគម្រោងព្យាបាលថ្មី (New Treatment Plan)
            </h3>
            <form onSubmit={handleCreateManual} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">ឈ្មោះអ្នកជំងឺ</label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. សុខ ចាន់រ៉ាវី"
                  value={addPatientName}
                  onChange={(e) => setAddPatientName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                <input
                  type="tel"
                  placeholder="012 345 678"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">ឈ្មោះសេវាកម្មព្យាបាល</label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. Root Canal Treatment"
                  value={addServiceName}
                  onChange={(e) => setAddServiceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">តម្លៃសរុប ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addTotalCost}
                    onChange={(e) => setAddTotalCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ចំនួនលើកសរុប</label>
                  <input
                    type="number"
                    min="1"
                    value={addTotalVisits}
                    onChange={(e) => setAddTotalVisits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  បង្កើតគម្រោង
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
