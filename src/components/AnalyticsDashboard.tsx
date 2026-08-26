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
import { QueueItem, SalesRecord, TreatmentLifecycle } from "../types";
import PrintInvoiceModal from "./PrintInvoiceModal";

type DatePreset = "Today" | "This Week" | "This Month" | "Last Month" | "Custom Month";

export default function AnalyticsDashboard() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [treatments, setTreatments] = useState<TreatmentLifecycle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Print/View Invoice States
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null);
  const [selectedBillingDetails, setSelectedBillingDetails] = useState<any | null>(null);

  const handleViewInvoice = (txn: SalesRecord) => {
    // Find matching queue item to get treatment items, doctor, phone
    const qItem = queue.find((q) => q.visitId === txn.visitId);
    const patient = patients.find((p) => p.id === txn.patientId);

    const phone = qItem?.phone || patient?.phone || "N/A";
    const doctor = qItem?.doctor || "Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)";
    
    // If queue item has treatmentItems, use them; otherwise construct a default one based on txn details
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
    // Default to current year-month, e.g. "2026-07"
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  // Fetch all necessary raw data from APIs
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, patientsRes, queueRes, treatmentsRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/patients"),
        fetch("/api/queue"),
        fetch("/api/treatments")
      ]);

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(salesData.ledger || []);
      }
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData || []);
      }
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData || []);
      }
      if (treatmentsRes.ok) {
        const treatmentsData = await treatmentsRes.json();
        setTreatments(treatmentsData || []);
      }
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
    
    // Clear hours to compare calendar days accurately
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const itemStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

    if (activePreset === "Today") {
      return itemStart.getTime() === todayStart.getTime();
    }

    if (activePreset === "This Week") {
      // Last 7 days boundary
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
      let targetMonth = today.getMonth() - 1;
      let targetYear = today.getFullYear();
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
      return (
        itemDate.getFullYear() === targetYear &&
        itemDate.getMonth() === targetMonth
      );
    }

    if (activePreset === "Custom Month") {
      // Format: "YYYY-MM"
      if (!selectedMonth) return false;
      const [yearStr, monthStr] = selectedMonth.split("-");
      const targetYear = parseInt(yearStr, 10);
      const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed
      return (
        itemDate.getFullYear() === targetYear &&
        itemDate.getMonth() === targetMonth
      );
    }

    return false;
  };

  // 1. Financial KPIs (Total Revenue)
  const filteredSales = sales.filter((s) => s.date && checkInDateRange(s.date));
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.amount, 0);

  // Breakdown by Payment Method (ABA, Cash, Card)
  const methodStats = filteredSales.reduce(
    (acc, s) => {
      const method = s.paymentMethod || "Cash";
      if (method.toLowerCase().includes("aba") || method.toLowerCase().includes("qr")) {
        acc.aba += s.amount;
      } else if (method.toLowerCase().includes("card")) {
        acc.card += s.amount;
      } else {
        acc.cash += s.amount;
      }
      return acc;
    },
    { cash: 0, aba: 0, card: 0 }
  );

  // 2. Growth KPIs (New Patients registered)
  const filteredNewPatients = patients.filter(
    (p) => p.createdAt && checkInDateRange(p.createdAt)
  );
  const newPatientsCount = filteredNewPatients.length;

  // 3. Retention KPIs (Outstanding Balance)
  // Cash flow health is indicated by outstanding treatment fees.
  // We can calculate outstanding balance for all plans initiated or updated in this period,
  // or show the current outstanding balance on active plans to date.
  // Showing outstanding balance for active treatment plans whose last update was in the range, or active plans overall:
  const activeTreatments = treatments.filter((t) => t.status === "Active");
  const outstandingBalanceGlobal = activeTreatments.reduce(
    (sum, t) => sum + (t.remainingBalance || 0),
    0
  );

  // Outstanding balance on plans created/updated in the selected range
  const filteredTreatmentsInRange = treatments.filter(
    (t) => t.lastVisitDate && checkInDateRange(t.lastVisitDate)
  );
  const outstandingBalanceInRange = filteredTreatmentsInRange.reduce(
    (sum, t) => sum + (t.remainingBalance || 0),
    0
  );

  // Active treatments count in selected range vs total
  const activeTreatmentsInRangeCount = filteredTreatmentsInRange.filter(t => t.status === "Active").length;

  // 4. Analytics: Top Services
  // We analyze the `treatmentItems` in completed `queue` items within the selected period
  const completedVisitsInRange = queue.filter(
    (q) => q.status === "Completed" && q.checkInTime && checkInDateRange(q.checkInTime)
  );

  const serviceAggregates: {
    [key: string]: { serviceName: string; count: number; revenue: number };
  } = {};

  completedVisitsInRange.forEach((v) => {
    if (v.treatmentItems && Array.isArray(v.treatmentItems)) {
      v.treatmentItems.forEach((item) => {
        const name = item.service || "General Treatment";
        const qty = Number(item.qty || 1);
        const rate = Number(item.rate || 0);
        const itemRevenue = qty * rate;

        if (!serviceAggregates[name]) {
          serviceAggregates[name] = {
            serviceName: name,
            count: 0,
            revenue: 0,
          };
        }
        serviceAggregates[name].count += qty;
        serviceAggregates[name].revenue += itemRevenue;
      });
    }
  });

  const topServices = Object.values(serviceAggregates).sort(
    (a, b) => b.revenue - a.revenue || b.count - a.count
  );

  const maxServiceRevenue = topServices.length > 0 ? topServices[0].revenue : 1;

  // Render month picker list of labels for Khmer
  const getKhmerMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const khmerMonths = [
      "មករា (Jan)",
      "កុម្ភៈ (Feb)",
      "មីនា (Mar)",
      "មេសា (Apr)",
      "ឧសភា (May)",
      "មិថុនា (Jun)",
      "កក្កដា (Jul)",
      "សីហា (Aug)",
      "កញ្ញា (Sep)",
      "តុលា (Oct)",
      "វិច្ឆិកា (Nov)",
      "ធ្នូ (Dec)"
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${khmerMonths[mIdx]} ${year}`;
  };

  const handleExportCSV = () => {
    const headers = [
      "លេខកូដប្រតិបត្តិការ (Transaction Code)",
      "កាលបរិច្ឆេទ & ម៉ោង (Date & Time)",
      "ឈ្មោះអ្នកជំងឺ (Patient Name)",
      "លេខកូដអ្នកជំងឺ (Patient ID)",
      "វិធីសាស្ត្រទូទាត់ (Payment Method)",
      "ទឹកប្រាក់បានបង់សរុប (Total Amount Paid)",
      "ស្ថានភាពការព្យាបាល (Treatment Status)",
      "សមតុល្យទឹកប្រាក់នៅសល់ (Remaining Balance)"
    ];

    const getPaymentMethodLabel = (method: string) => {
      if (method === "Cash") return "Cash (លុយសុទ្ធ)";
      if (method === "ABA Bank / QR") return "ABA Bank / QR Code";
      if (method === "Card") return "Card (កាតឥណទាន)";
      return method;
    };

    const csvRows = filteredSales.map((txn) => {
      const txnCode = txn.txnId;
      const dateFormatted = new Date(txn.date).toLocaleDateString("en-US") + " " + 
                            new Date(txn.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const patientName = txn.patientName.replace(/"/g, '""');
      const patientId = txn.patientId;
      const paymentMethod = getPaymentMethodLabel(txn.paymentMethod);
      const totalPaid = `$${txn.amount.toFixed(2)}`;

      const matchingTreatments = treatments.filter((t) => t.patientId === txn.patientId);
      
      let treatmentStatus = "Completed (បានបញ្ចប់)";
      let remainingBalanceVal = 0;

      if (matchingTreatments.length > 0) {
        const activeT = matchingTreatments.find((t) => t.status === "Active");
        if (activeT) {
          treatmentStatus = "Active (កំពុងព្យាបាល)";
          remainingBalanceVal = matchingTreatments
            .filter((t) => t.status === "Active")
            .reduce((sum, t) => sum + (t.remainingBalance || 0), 0);
        } else {
          treatmentStatus = "Completed (បានបញ្ចប់)";
          remainingBalanceVal = 0;
        }
      }

      const remainingBalance = `$${remainingBalanceVal.toFixed(2)}`;

      return [
        `"${txnCode}"`,
        `"${dateFormatted}"`,
        `"${patientName}"`,
        `"${patientId}"`,
        `"${paymentMethod}"`,
        `"${totalPaid}"`,
        `"${treatmentStatus}"`,
        `"${remainingBalance}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const todayStr = new Date().toISOString().split("T")[0];
    const fileName = `Brace_Studio_Dental_Clinic_Report_${todayStr}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="analytics-report-dashboard" className="space-y-6">
      
      {/* 1. Dashboard Title Section & Auto Refresh */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              📊 ស្ថិតិវិភាគ & របាយការណ៍ហិរញ្ញវត្ថុគ្លីនិក
            </h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Brace Studio Dental Clinic
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            តាមដានលំហូរសាច់ប្រាក់ ចំនួនអ្នកជំងឺថ្មី សមតុល្យសេសសល់ និងចំណាត់ថ្នាក់សេវាកម្មពេញនិយមរបស់ Brace Studio Dental Clinic
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition cursor-pointer"
            title="ទាញយកទិន្នន័យជាឯកសារ CSV (Export CSV)"
          >
            <Download className="w-4 h-4" />
            <span>ទាញយកទិន្នន័យ (Export CSV)</span>
          </button>

          <button
            onClick={fetchAllData}
            className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="ទាញយកទិន្នន័យថ្មីចុងក្រោយ"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Intelligent Date filter presets and custom historical month picker */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Relative Presets Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["Today", "This Week", "This Month"] as DatePreset[]).map((preset) => {
            const labelMap: { [key: string]: string } = {
              Today: "ថ្ងៃនេះ",
              "This Week": "សប្តាហ៍នេះ",
              "This Month": "ខែនេះ"
            };
            return (
              <button
                key={preset}
                onClick={() => {
                  setActivePreset(preset);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activePreset === preset
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {labelMap[preset]} ({preset})
              </button>
            );
          })}
        </div>

        {/* Custom Historical Month Picker */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            ជ្រើសរើសខែប្រវត្តិសាស្ត្រ៖
          </span>
          <div className="relative flex items-center">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setActivePreset("Custom Month");
              }}
              className={`p-2 pl-3 pr-8 border rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer ${
                activePreset === "Custom Month"
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200 text-slate-700"
              }`}
            />
          </div>
        </div>

      </div>

      {/* Date period visual indicator */}
      <div className="text-xs font-bold text-slate-500 px-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        របាយការណ៍សរុបសម្រាប់៖{" "}
        <span className="text-blue-600 font-extrabold underline decoration-wavy decoration-blue-200 decoration-2">
          {activePreset === "Custom Month" ? getKhmerMonthName(selectedMonth) : activePreset}
        </span>
      </div>

      {/* 3. Three-Pillar Bento Metric Grid (Financial, Growth, Retention) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pillar 1: Financial - Total Revenue (The Pulse) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs hover:border-emerald-200 transition relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:scale-110 transition duration-300"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full">
              The Pulse (ចំណូល)
            </span>
          </div>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ចំណូលសរុបប្រមូលបាន (Total Revenue)</span>
          <h3 className="text-2xl font-black text-slate-800 font-mono mt-1 group-hover:text-emerald-700 transition">
            ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            ផ្អែកលើការទូទាត់ជាក់ស្តែង និងវិក្កយបត្រដែលបានបញ្ចប់ក្នុងវគ្គនេះ។
          </p>

          {/* Drawer cash / method breakdown */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
              <span className="text-slate-400 block font-semibold">ABA / QR</span>
              <span className="font-bold text-blue-600 font-mono">${methodStats.aba.toFixed(1)}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
              <span className="text-slate-400 block font-semibold">សាច់ប្រាក់</span>
              <span className="font-bold text-emerald-600 font-mono">${methodStats.cash.toFixed(1)}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
              <span className="text-slate-400 block font-semibold">កាតធនាគារ</span>
              <span className="font-bold text-indigo-600 font-mono">${methodStats.card.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Growth - New Patients (Marketing Effectiveness) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs hover:border-blue-200 transition relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-bl-full group-hover:scale-110 transition duration-300"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full">
              Growth (ទីផ្សារ)
            </span>
          </div>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">អតិថិជនថ្មីដែលបានចុះឈ្មោះ (New Patients)</span>
          <h3 className="text-2xl font-black text-slate-800 font-mono mt-1 group-hover:text-blue-700 transition">
            +{newPatientsCount} <span className="text-xs text-slate-400 font-sans">នាក់</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            វាស់ស្ទង់ប្រសិទ្ធភាពនៃការផ្សព្វផ្សាយ និងការទាក់ទាញអតិថិជនថ្មី។
          </p>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ចំនួនអ្នកជំងឺសរុប (All-time):</span>
            <span className="font-bold text-slate-700">{patients.length} នាក់</span>
          </div>
        </div>

        {/* Pillar 3: Retention - Outstanding Balance (Cash Flow Health) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs hover:border-orange-200 transition relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-orange-500/5 rounded-bl-full group-hover:scale-110 transition duration-300"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100 text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-150 px-2 py-0.5 rounded-full">
              Retention (សមតុល្យលំហូរ)
            </span>
          </div>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ប្រាក់នៅសល់ត្រូវប្រមូល (Outstanding Balance)</span>
          <h3 className="text-2xl font-black text-slate-800 font-mono mt-1 group-hover:text-orange-700 transition">
            ${outstandingBalanceInRange.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            សមតុល្យមិនទាន់ប្រមូលបាន ពីវគ្គការព្យាបាលដែលបានបង្កើត/ធ្វើបច្ចុប្បន្នភាពក្នុងសម័យកាលនេះ។
          </p>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>គម្រោងសកម្មក្នុងសម័យកាលនេះ:</span>
            <span className="font-bold text-slate-700">{activeTreatmentsInRangeCount} គម្រោង</span>
          </div>
        </div>

      </div>

      {/* Global Clinical Cash Flow Health Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-800">🏥 សុខភាពលំហូរសាច់ប្រាក់សរុបគ្រប់ពេល (Global Cash Flow Health)</h4>
          <p className="text-[11px] text-slate-500">
            គ្លីនិកមានសមតុល្យសរុបចំនួន <span className="font-bold text-blue-600">${outstandingBalanceGlobal.toFixed(2)}</span> ទៀតដែលត្រូវប្រមូលពីគ្រប់គម្រោងសកម្មទាំងអស់ (Active multi-visit treatment plans)។
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-blue-100 text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block"> outstanding global</span>
          <span className="font-mono text-sm font-black text-blue-700">${outstandingBalanceGlobal.toFixed(2)}</span>
        </div>
      </div>

      {/* 4. Top Services Report & Ranking List */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              ចំណាត់ថ្នាក់សេវាកម្មពេញនិយម និងរកចំណូលបានច្រើនជាងគេ (Top Services & Revenue)
            </h3>
            <p className="text-[11px] text-slate-400">
              ការវិភាគទិន្នន័យសេវាកម្មដែលពេញនិយមបំផុត គិតជាប្រាក់ចំណូលសរុបក្នុងអំឡុងពេលដែលបានជ្រើសរើស
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            សរុប {topServices.length} សេវាកម្ម
          </span>
        </div>

        {topServices.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 italic">
            មិនមានទិន្នន័យសេវាកម្មទូទាត់ សម្រាប់កាលបរិច្ឆេទដែលបានជ្រើសរើសឡើយ។
          </div>
        ) : (
          <div className="space-y-4">
            {topServices.map((srv, idx) => {
              const pct = Math.round((srv.revenue / maxServiceRevenue) * 100);
              const rankIcons = ["🥇", "🥈", "🥉"];
              const isTopThree = idx < 3;

              return (
                <div key={srv.serviceName} className="group space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-slate-400 text-[10px]">
                        {isTopThree ? rankIcons[idx] : idx + 1}
                      </span>
                      <span className="font-bold text-slate-700 group-hover:text-blue-700 transition">
                        {srv.serviceName}
                      </span>
                      <span className="font-mono text-[9px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100">
                        លក់បាន {srv.count} ដង
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-800">${srv.revenue.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Progressive custom bar visual */}
                  <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                          : idx === 1
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500"
                          : idx === 2
                          ? "bg-gradient-to-r from-amber-500 to-orange-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Recent Transaction logs table bottom panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              ប្រតិបត្តិការគិតប្រាក់ថ្មីៗ
            </h3>
            <p className="text-[11px] text-slate-400">
              {activePreset === "Today" ? "សរុបគណនីបង់ប្រាក់ថ្ងៃនេះរបស់គ្លីនិក" : `សរុបគណនីបង់ប្រាក់សម្រាប់កំឡុងពេល៖ ${activePreset === "Custom Month" ? getKhmerMonthName(selectedMonth) : activePreset}`}
            </p>
          </div>
          <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 italic">
            គ្មានប្រតិបត្តិការគិតប្រាក់ក្នុងកំឡុងពេលនេះឡើយ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/70 font-bold">
                  <th className="px-4 py-2 rounded-l-lg">កូដប្រតិបត្តិការ</th>
                  <th className="px-4 py-2">អ្នកជំងឺ</th>
                  <th className="px-4 py-2">ការបង់ប្រាក់</th>
                  <th className="px-4 py-2">កាលបរិច្ឆេទ / ម៉ោង</th>
                  <th className="px-4 py-2 text-right">ទឹកប្រាក់</th>
                  <th className="px-4 py-2 text-center rounded-r-lg">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredSales.map((txn) => {
                  const getPaymentMethodKhmer = (method: string) => {
                    if (method === "Cash") return "លុយសុទ្ធ";
                    if (method === "ABA Bank / QR") return "ABA Bank / QR Code";
                    if (method === "Card") return "កាតឥណទាន";
                    return method;
                  };

                  return (
                    <tr key={txn.txnId} className="hover:bg-slate-50/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{txn.txnId}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-850 block">{txn.patientName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">លេខកូដអ្នកជំងឺ: {txn.patientId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-slate-700 border border-slate-150">
                          {getPaymentMethodKhmer(txn.paymentMethod)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(txn.date).toLocaleDateString("en-US")} {new Date(txn.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-blue-600">
                        ${txn.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewInvoice(txn)}
                          title="មើល បោះពុម្ព និងទាញយកវិក្កយបត្រ"
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>វិក្កយបត្រ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice receipt print/view portal */}
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
