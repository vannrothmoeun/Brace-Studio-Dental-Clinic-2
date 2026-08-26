/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Calendar,
  Award,
  CreditCard,
  UserPlus,
  ArrowRight,
  TrendingDown,
  Percent,
  RefreshCw,
  Layers,
  Eye,
  Printer,
  Download
} from "lucide-react";
import { QueueItem, SalesRecord, TreatmentLifecycle, Patient } from "../types";
import {
  getFirestoreCollection,
  COLLECTIONS,
} from "../services/firestoreService";
import PrintInvoiceModal from "./PrintInvoiceModal";

type DatePreset = "Today" | "This Week" | "This Month" | "Last Month" | "Custom Month";

export default function AnalyticsDashboard() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [treatments, setTreatments] = useState<TreatmentLifecycle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Print/View Invoice States
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null);
  const [selectedBillingDetails, setSelectedBillingDetails] = useState<any | null>(null);

  const handleViewInvoice = (txn: SalesRecord) => {
    const qItem = queue.find((q) => q.visitId === txn.visitId);
    const patient = patients.find((p) => p.id === txn.patientId);

    const phone = qItem?.phone || patient?.phone || "N/A";
    const doctor = qItem?.doctor || "Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)";
    
    const items = (qItem?.treatmentItems && qItem.treatmentItems.length > 0)
      ? qItem.treatmentItems
      : [{ service: "សេវាកម្មព្យាបាលធ្មេញ", qty: 1, rate: txn.amount, desc: "ការព្យាបាលទូទៅ" }];

    const invoiceNo = qItem?.invoiceNo || ("INV-" + txn.txnId.replace("TXN", ""));

    const billingDetails = {
      name: txn.patientName,
      phone: phone,
      patientId: txn.patientId,
      paymentMethod: txn.paymentMethod,
      doctor: doctor,
      discountPct: 0,
      depositUsed: 0,
      items: items
    };

    setSelectedInvoiceNo(invoiceNo);
    setSelectedBillingDetails(billingDetails);
  };

  // Filter States
  const [activePreset, setActivePreset] = useState<DatePreset>("This Month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  // Fetch all necessary raw data from direct Firestore
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [salesData, patientsData, queueData, treatmentsData] = await Promise.all([
        getFirestoreCollection<SalesRecord>(COLLECTIONS.SALES),
        getFirestoreCollection<Patient>(COLLECTIONS.PATIENTS),
        getFirestoreCollection<QueueItem>(COLLECTIONS.QUEUE),
        getFirestoreCollection<TreatmentLifecycle>(COLLECTIONS.TREATMENTS)
      ]);

      setSales(salesData);
      setPatients(patientsData);
      setQueue(queueData);
      setTreatments(treatmentsData);
    } catch (err) {
      console.error("Failed to load dashboard report data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Helpers to define date boundaries for presets
  const checkInDateRange = (itemDateStr: string): boolean => {
    const itemDate = new Date(itemDateStr);
    const today = new Date();
    
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const itemStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

    if (activePreset === "Today") {
      return itemStart.getTime() === todayStart.getTime();
    }

    if (activePreset === "This Week") {
      const oneWeekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemStart >= oneWeekAgo && itemStart <= today;
    }

    if (activePreset === "This Month") {
      return (
        itemDate.getFullYear() === today.getFullYear() &&
        itemDate.getMonth() === today.getMonth()
      );
    }

    if (activePreset === "Last Month") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return (
        itemDate.getFullYear() === lastMonth.getFullYear() &&
        itemDate.getMonth() === lastMonth.getMonth()
      );
    }

    if (activePreset === "Custom Month" && selectedMonth) {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const filterYear = parseInt(yearStr, 10);
      const filterMonth = parseInt(monthStr, 10) - 1;
      return itemDate.getFullYear() === filterYear && itemDate.getMonth() === filterMonth;
    }

    return true;
  };

  // Filtered sales ledger
  const filteredSales = sales.filter((item) => checkInDateRange(item.date));

  // Filtered new patients in date range
  const filteredNewPatients = patients.filter((item) =>
    item.createdAt ? checkInDateRange(item.createdAt) : false
  );

  // Filtered completed visits in date range
  const filteredQueue = queue.filter(
    (item) => item.status === "Completed" && item.checkInTime && checkInDateRange(item.checkInTime)
  );

  // Financial Metrics
  const totalRevenue = filteredSales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalTransactions = filteredSales.length;
  const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Breakdown by payment methods
  const paymentBreakdown = filteredSales.reduce(
    (acc, curr) => {
      const method = curr.paymentMethod || "Cash";
      acc[method] = (acc[method] || 0) + curr.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  // Top services performed during selected timeframe
  const serviceStatsMap: Record<string, { count: number; revenue: number }> = {};
  filteredQueue.forEach((q) => {
    if (q.treatmentItems && Array.isArray(q.treatmentItems)) {
      q.treatmentItems.forEach((t) => {
        const name = t.service || "ទូទៅ (General)";
        const rev = (Number(t.qty) || 1) * (Number(t.rate) || 0);
        if (!serviceStatsMap[name]) {
          serviceStatsMap[name] = { count: 0, revenue: 0 };
        }
        serviceStatsMap[name].count += Number(t.qty) || 1;
        serviceStatsMap[name].revenue += rev;
      });
    }
  });

  const topServices = Object.entries(serviceStatsMap)
    .map(([serviceName, stat]) => ({ serviceName, ...stat }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div id="analytics-dashboard-container" className="space-y-6">
      {/* 1. Dashboard Header & Time Filter Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              📊 របាយការណ៍ហិរញ្ញវត្ថុ & ចំណូល (Financial Analytics)
            </h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Direct Firestore
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ទិន្នន័យប្រាក់ចំណូល ចំនួនអ្នកជំងឺ និងស្ថិតិប្រតិបត្តិការគ្លីនិក
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100/80 p-1 rounded-xl">
            {(["Today", "This Week", "This Month", "Last Month", "Custom Month"] as DatePreset[]).map(
              (preset) => (
                <button
                  key={preset}
                  onClick={() => setActivePreset(preset)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activePreset === preset
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {preset === "Today"
                    ? "ថ្ងៃនេះ"
                    : preset === "This Week"
                    ? "សប្តាហ៍នេះ"
                    : preset === "This Month"
                    ? "ខែនេះ"
                    : preset === "Last Month"
                    ? "ខែមុន"
                    : "ជ្រើសរើសខែ"}
                </button>
              )
            )}
          </div>

          {activePreset === "Custom Month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
            />
          )}

          <button
            onClick={fetchAllData}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
            title="ទាញទិន្នន័យឡើងវិញ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">
              ចំណូលសរុប (Total Revenue)
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              គិតតាមជម្រើស: <strong>{activePreset}</strong>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">
              ប្រតិបត្តិការបង់ប្រាក់ (Invoices)
            </span>
            <div className="text-2xl font-black font-mono text-slate-800">
              {totalTransactions}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              វិក្កយបត្របានចេញរួច
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Avg Ticket */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">
              ចំណូលមធ្យម/វិក្កយបត្រ
            </span>
            <div className="text-2xl font-black font-mono text-indigo-600">
              ${avgTicket.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Average Ticket Size
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* New Patients Registered */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">
              អ្នកជំងឺថ្មី (New Patients)
            </span>
            <div className="text-2xl font-black font-mono text-purple-600">
              {filteredNewPatients.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              សរុបក្នុងប្រព័ន្ធ: {patients.length} នាក់
            </div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Breakdown by Payment Method & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            ការបែងចែកតាមវិធីសាស្ត្រទូទាត់ប្រាក់
          </h3>

          <div className="space-y-3">
            {(Object.entries(paymentBreakdown) as [string, number][]).map(([method, amount]) => {
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">{method}</span>
                    <span className="font-mono text-slate-900">
                      ${Number(amount).toFixed(2)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(paymentBreakdown).length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">
                គ្មានប្រតិបត្តិការក្នុងចន្លោះពេលនេះឡើយ។
              </p>
            )}
          </div>
        </div>

        {/* Top Services Performed */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            សេវាកម្មព្យាបាលពេញនិយម & រកចំណូលបានច្រើន
          </h3>

          <div className="space-y-3">
            {topServices.map((srv, idx) => {
              const pct = totalRevenue > 0 ? (srv.revenue / totalRevenue) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">
                      #{idx + 1} {srv.serviceName} ({srv.count} លើក)
                    </span>
                    <span className="font-mono text-emerald-600">
                      ${srv.revenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topServices.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">
                គ្មានទិន្នន័យសេវាកម្មក្នុងចន្លោះពេលនេះឡើយ។
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Sales Ledger Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              សៀវភៅកត់ត្រាការលក់ & បង់ប្រាក់ (Sales Ledger)
            </h3>
            <p className="text-xs text-slate-400">
              បង្ហាញប្រតិបត្តិការទាំងអស់ ({filteredSales.length})
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-wider text-left bg-slate-50/70 rounded-xl">
                <th className="px-4 py-3 font-bold rounded-l-xl">កាលបរិច្ឆេទ</th>
                <th className="px-4 py-3 font-bold">កូដប្រតិបត្តិការ</th>
                <th className="px-4 py-3 font-bold">អ្នកជំងឺ</th>
                <th className="px-4 py-3 font-bold">វិធីសាស្ត្រទូទាត់</th>
                <th className="px-4 py-3 font-bold">ចំនួនទឹកប្រាក់ ($)</th>
                <th className="px-4 py-3 font-bold text-right rounded-r-xl">វិក្កយបត្រ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((item) => (
                <tr key={item.txnId} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {new Date(item.date).toLocaleDateString("en-GB")} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-500">
                    {item.txnId}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                    {item.patientName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {item.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono font-black text-emerald-600 text-sm">
                    ${Number(item.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleViewInvoice(item)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg font-bold text-[10px] transition cursor-pointer inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>មើល / បោះពុម្ព</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    គ្មានប្រតិបត្តិការក្នុងចន្លោះពេលនេះឡើយ។
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Invoice Modal */}
      {selectedInvoiceNo && selectedBillingDetails && (
        <PrintInvoiceModal
          invoiceNo={selectedInvoiceNo}
          billingDetails={selectedBillingDetails}
          onClose={() => {
            setSelectedInvoiceNo(null);
            setSelectedBillingDetails(null);
          }}
        />
      )}
    </div>
  );
}
