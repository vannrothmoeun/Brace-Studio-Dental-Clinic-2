/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Activity,
  Calendar,
  DollarSign,
  Layers,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Search,
  MessageSquare,
  Bookmark,
  Menu,
  X,
  Flame,
  CheckCircle2,
  Cloud
} from "lucide-react";
import ClinicStatsCards from "./components/ClinicStatsCards";
import PatientSearchCheckIn from "./components/PatientSearchCheckIn";
import ActiveQueueTable from "./components/ActiveQueueTable";
import BillingInvoiceModal from "./components/BillingInvoiceModal";
import PrintInvoiceModal from "./components/PrintInvoiceModal";
import ServicePricesManager from "./components/ServicePricesManager";
import TreatmentLifecyclePanel from "./components/TreatmentLifecyclePanel";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import AppointmentBookingManager from "./components/AppointmentBookingManager";
import { QueueItem, ClinicStats, SalesRecord } from "./types";
import { syncLocalToFirestore } from "./services/firestoreService";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "booking" | "prices" | "followup" | "reports">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // App states
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [salesLedger, setSalesLedger] = useState<SalesRecord[]>([]);
  const [stats, setStats] = useState<ClinicStats>({
    totalPatients: 0,
    todayVisits: 0,
    todaySales: 0,
    avgTicket: 0,
    waitingCount: 0,
    inTreatmentCount: 0,
  });

  // Billing modal controls
  const [checkoutItem, setCheckoutItem] = useState<QueueItem | null>(null);
  const [printedInvoiceNo, setPrintedInvoiceNo] = useState<string | null>(null);
  const [printedBillingDetails, setPrintedBillingDetails] = useState<any | null>(null);

  // Firestore sync state
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [lastFirestoreSync, setLastFirestoreSync] = useState<Date | null>(null);

  // Sync with Firestore
  const triggerFirestoreSync = async () => {
    setIsSyncingFirestore(true);
    try {
      const res = await syncLocalToFirestore();
      if (res.success) {
        setLastFirestoreSync(new Date());
      }
    } catch (err) {
      console.warn("Firestore sync error:", err);
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // Load stats & queue
  const loadClinicData = async () => {
    try {
      // 1. Fetch queue items
      const queueRes = await fetch("/api/queue");
      if (queueRes.ok) {
        const queueData = await queueRes.ok ? await queueRes.json() : [];
        setQueue(queueData);
      }

      // 2. Fetch sales and overall metrics
      const salesRes = await fetch("/api/sales");
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSalesLedger(salesData.ledger || []);

        const metrics = salesData.metrics || {};
        const completedVisits = metrics.completedVisits || 0;
        const totalRev = metrics.totalRevenue || 0;

        setStats({
          totalPatients: metrics.totalPatients || 0,
          todayVisits: completedVisits,
          todaySales: totalRev,
          avgTicket: completedVisits > 0 ? totalRev / completedVisits : 0,
          waitingCount: queue.filter((q) => q.status === "Waiting").length,
          inTreatmentCount: queue.filter((q) => q.status === "In Treatment").length,
        });
      }
    } catch (error) {
      console.error("Failed to load clinical statistics:", error);
    }
  };

  useEffect(() => {
    loadClinicData();
    // Initial Firestore synchronization on app load
    triggerFirestoreSync();

    // Auto-poll clinic queue status every 15 seconds to ensure real-time synchronization
    const pollInterval = setInterval(loadClinicData, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  const getPaymentMethodKhmer = (method: string) => {
    if (method === "Cash") return "លុយសុទ្ធ";
    if (method === "ABA Bank / QR") return "ABA Bank / QR Code";
    if (method === "Card") return "កាតឥណទាន";
    return method;
  };

  const handleCheckoutSuccess = (invoiceNo: string, billingDetails: any) => {
    setCheckoutItem(null); // Close checkout modal
    setPrintedInvoiceNo(invoiceNo); // Open print preview modal
    setPrintedBillingDetails(billingDetails);
    loadClinicData(); // Reload queue and KPIs
    triggerFirestoreSync(); // Sync to Firestore cloud
  };

  const handleCheckInFromAppointment = async (
    patientName: string,
    phone: string,
    doctor?: string,
    appointmentId?: string
  ) => {
    try {
      const res = await fetch("/api/queue/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patientName,
          phone: phone,
          doctor: doctor || "Dr. Ly MengKheang",
        }),
      });
      if (res.ok) {
        if (appointmentId) {
          await fetch(`/api/appointments/${appointmentId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Completed" }),
          }).catch(() => {});
        }
        await loadClinicData();
        triggerFirestoreSync();
        setActiveTab("dashboard");
      }
    } catch (e) {
      console.error("Failed to check in appointment patient:", e);
    }
  };

  return (
    <div id="mengkheang-app-root" className="min-h-screen bg-slate-50 flex font-sans select-none">
      
      {/* 1. SIDEBAR DRAWER - Left Side */}
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden transition-opacity backdrop-blur-xs"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed md:sticky top-0 left-0 z-50 md:z-30 w-64 h-screen bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 transform 
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} 
        border-r border-slate-850`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
              <span className="text-xl">🦷</span>
            </div>
            <div>
              <h2 className="text-xs font-black tracking-tight text-white leading-tight">
                Brace Studio Dental Clinic
              </h2>
              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                Dental Clinic System
              </p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-3.5 rounded-xl text-xs font-bold transition flex items-center gap-3.5 cursor-pointer ${
              activeTab === "dashboard" 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black" 
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4 flex-shrink-0 text-blue-400 active:text-white" />
            <span>ផ្នែកទទួលភ្ញៀវ</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("booking");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-3.5 rounded-xl text-xs font-bold transition flex items-center gap-3.5 cursor-pointer ${
              activeTab === "booking" 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black" 
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4 flex-shrink-0 text-indigo-400 active:text-white" />
            <span>ណាត់ជួប</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("prices");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-3.5 rounded-xl text-xs font-bold transition flex items-center gap-3.5 cursor-pointer ${
              activeTab === "prices" 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black" 
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4 flex-shrink-0 text-amber-400 active:text-white" />
            <span>តារាងតម្លៃ</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("followup");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-3.5 rounded-xl text-xs font-bold transition flex items-center gap-3.5 cursor-pointer ${
              activeTab === "followup" 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black" 
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0 text-emerald-400 active:text-white" />
            <span>តាមដានការព្យាបាល</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("reports");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-3.5 rounded-xl text-xs font-bold transition flex items-center gap-3.5 cursor-pointer ${
              activeTab === "reports" 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black" 
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4 flex-shrink-0 text-rose-400 active:text-white" />
            <span>របាយការណ៍ & ស្ថិតិ</span>
          </button>
        </nav>

        {/* Sidebar Footer / Online indicator */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
          <div className="flex items-center gap-2 justify-center mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">សកម្ម / Online</span>
          </div>
          <p className="text-[9px] text-slate-500">ប្រព័ន្ធគ្រប់គ្រងគ្លីនិកធ្មេញ</p>
        </div>
      </aside>

      {/* 2. RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Mobile Header Bar (Only visible on mobile) */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xs font-black tracking-tight">
              {activeTab === "dashboard" && "ផ្នែកទទួលភ្ញៀវ"}
              {activeTab === "booking" && "គ្រប់គ្រងការណាត់ជួប"}
              {activeTab === "prices" && "តារាងតម្លៃសេវាកម្ម"}
              {activeTab === "followup" && "តាមដានការព្យាបាល"}
              {activeTab === "reports" && "របាយការណ៍ & ស្ថិតិ"}
            </h1>
          </div>
          <button
            onClick={triggerFirestoreSync}
            disabled={isSyncingFirestore}
            className="text-[10px] font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full border border-white/25 flex items-center gap-1 cursor-pointer transition"
          >
            <Flame className={`w-3 h-3 text-amber-300 ${isSyncingFirestore ? "animate-spin" : ""}`} />
            <span>{isSyncingFirestore ? "Syncing..." : "Firestore"}</span>
          </button>
        </header>

        {/* Desktop Title & Date Bar */}
        <header className="hidden md:flex bg-white border-b border-slate-150 h-16 px-8 items-center justify-between shadow-2xs">
          <div>
            <h1 className="text-sm font-extrabold text-slate-800">
              {activeTab === "dashboard" && "ផ្នែកទទួលភ្ញៀវ & បញ្ជីរង់ចាំ"}
              {activeTab === "booking" && "តារាងណាត់ជួប និង ប្រតិទិនការងារ"}
              {activeTab === "prices" && "គ្រប់គ្រងតារាងតម្លៃសេវាកម្ម"}
              {activeTab === "followup" && "តាមដានវដ្តជីវិតនៃការព្យាបាល និងការណាត់បន្ត"}
              {activeTab === "reports" && "របាយការណ៍ហិរញ្ញវត្ថុ និងស្ថិតិវេជ្ជសាស្ត្រ"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Firestore Cloud Sync Badge & Button */}
            <button
              onClick={triggerFirestoreSync}
              disabled={isSyncingFirestore}
              title="Cloud Firestore Real-time Sync (brace-studio-dental-clinic)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Flame className={`w-3.5 h-3.5 text-amber-600 ${isSyncingFirestore ? "animate-spin" : ""}`} />
              <span className="font-bold">Firestore:</span>
              <span className="text-[11px] text-amber-800 font-mono">
                {isSyncingFirestore ? "Syncing..." : lastFirestoreSync ? "Connected" : "Connect"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </button>

            <button
              onClick={() => {
                loadClinicData();
                triggerFirestoreSync();
              }}
              title="ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ"
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-blue-600 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-400 font-semibold border-l border-slate-200 pl-4">
              {new Date().toLocaleDateString("kh-KH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </header>

        {/* Main Container Stage */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        
        {/* --- 1. RECEPTION DASHBOARD VIEW --- */}
        {activeTab === "dashboard" && (
          <div id="dashboard-stage" className="space-y-6">
            
            {/* KPI Cards section */}
            <ClinicStatsCards stats={stats} />

            {/* Patients form + Active list splits */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PatientSearchCheckIn onCheckInSuccess={loadClinicData} />
              </div>
              <div className="lg:col-span-2">
                <ActiveQueueTable
                  queue={queue}
                  onRefresh={loadClinicData}
                  onCheckout={(item) => setCheckoutItem(item)}
                />
              </div>
            </div>

          </div>
        )}

        {/* --- 2. APPOINTMENT BOOKING & CALENDAR VIEW --- */}
        {activeTab === "booking" && (
          <div id="booking-stage">
            <AppointmentBookingManager onCheckInToQueue={handleCheckInFromAppointment} />
          </div>
        )}

        {/* --- 4. SERVICES PRICES CATALOG VIEW --- */}
        {activeTab === "prices" && (
          <div id="prices-stage">
            <ServicePricesManager onPricesUpdated={loadClinicData} />
          </div>
        )}

        {/* --- 5. TREATMENT LIFECYCLE & FOLLOW-UPS VIEW --- */}
        {activeTab === "followup" && (
          <div id="followup-stage">
            <TreatmentLifecyclePanel />
          </div>
        )}

        {/* --- 6. CLINICAL REPORT & ANALYTICS VIEW --- */}
        {activeTab === "reports" && (
          <div id="reports-stage">
            <AnalyticsDashboard />
          </div>
        )}

      </main>

      {/* --- FLOATING & PORTAL OVERLAY MODALS --- */}

      {/* Checkout details checkout form portal */}
      {checkoutItem && (
        <BillingInvoiceModal
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Invoice receipt print preview portal */}
      {printedInvoiceNo && printedBillingDetails && (
        <PrintInvoiceModal
          invoiceNo={printedInvoiceNo}
          billingDetails={printedBillingDetails}
          onClose={() => {
            setPrintedInvoiceNo(null);
            setPrintedBillingDetails(null);
          }}
        />
      )}

      {/* Footer copyright */}
      <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-[10px] text-slate-400">
        <p>© 2026 គ្លីនិកធ្មេញ លី ម៉េងឃាង។ រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
      </footer>

      </div>
    </div>
  );
}
