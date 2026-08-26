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
import { QueueItem, ClinicStats, SalesRecord, Patient } from "./types";
import {
  getFirestoreCollection,
  subscribeToFirestoreCollection,
  ensureFirestoreInitialSeed,
  checkInPatientDirect,
  saveToFirestore,
  COLLECTIONS,
} from "./services/firestoreService";

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

  // Firestore connection status
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [lastFirestoreSync, setLastFirestoreSync] = useState<Date | null>(new Date());

  // Load stats & queue directly from Firestore
  const loadClinicData = async () => {
    setIsSyncingFirestore(true);
    try {
      const [queueData, salesData, patientsData] = await Promise.all([
        getFirestoreCollection<QueueItem>(COLLECTIONS.QUEUE),
        getFirestoreCollection<SalesRecord>(COLLECTIONS.SALES),
        getFirestoreCollection<Patient>(COLLECTIONS.PATIENTS),
      ]);

      setQueue(queueData);
      setSalesLedger(salesData);

      const completedVisits = queueData.filter((q) => q.status === "Completed").length;
      const totalRev = salesData.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      setStats({
        totalPatients: patientsData.length,
        todayVisits: completedVisits,
        todaySales: totalRev,
        avgTicket: completedVisits > 0 ? totalRev / completedVisits : 0,
        waitingCount: queueData.filter((q) => q.status === "Waiting").length,
        inTreatmentCount: queueData.filter((q) => q.status === "In Treatment").length,
      });

      setLastFirestoreSync(new Date());
    } catch (error) {
      console.error("Failed to load Firestore data:", error);
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  useEffect(() => {
    // 1. Ensure initial seed on empty Firestore
    ensureFirestoreInitialSeed().then(() => {
      loadClinicData();
    });

    // 2. Setup Real-time Firestore Listeners
    const unsubQueue = subscribeToFirestoreCollection<QueueItem>(COLLECTIONS.QUEUE, (updatedQueue) => {
      setQueue(updatedQueue);
      setStats((prev) => ({
        ...prev,
        waitingCount: updatedQueue.filter((q) => q.status === "Waiting").length,
        inTreatmentCount: updatedQueue.filter((q) => q.status === "In Treatment").length,
      }));
    });

    const unsubSales = subscribeToFirestoreCollection<SalesRecord>(COLLECTIONS.SALES, (updatedSales) => {
      setSalesLedger(updatedSales);
      const totalRev = updatedSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      setStats((prev) => ({
        ...prev,
        todaySales: totalRev,
        avgTicket: prev.todayVisits > 0 ? totalRev / prev.todayVisits : 0,
      }));
    });

    return () => {
      unsubQueue();
      unsubSales();
    };
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
    loadClinicData(); // Reload queue and KPIs from Firestore
  };

  const handleCheckInFromAppointment = async (
    patientName: string,
    phone: string,
    doctor?: string,
    appointmentId?: string
  ) => {
    try {
      await checkInPatientDirect({
        name: patientName,
        phone: phone,
        doctor: doctor || "Dr. Ly MengKheang",
      });

      if (appointmentId) {
        await saveToFirestore(COLLECTIONS.APPOINTMENTS, {
          id: appointmentId,
          status: "Completed",
        });
      }

      await loadClinicData();
      setActiveTab("dashboard");
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
            <DollarSign className="w-4 h-4 flex-shrink-0 text-amber-400 active:text-white" />
            <span>តារាងថ្លៃសេវា</span>
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
            <Layers className="w-4 h-4 flex-shrink-0 text-emerald-400 active:text-white" />
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
            <TrendingUp className="w-4 h-4 flex-shrink-0 text-purple-400 active:text-white" />
            <span>របាយការណ៍ហិរញ្ញវត្ថុ</span>
          </button>
        </nav>

        {/* Sidebar Footer & Doctor Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
              MK
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-200 truncate">Dr. Ly MengKheang</div>
              <div className="text-[10px] text-slate-400 truncate">Lead Dentist & Director</div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA - Right Side */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top App Bar with Clinic Status */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-20 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-slate-800">
              {activeTab === "dashboard" && "ផ្នែកទទួលភ្ញៀវ & ជួរពិនិត្យ (Reception & Queue)"}
              {activeTab === "booking" && "កាលវិភាគណាត់ជួប (Appointment Booking)"}
              {activeTab === "prices" && "តារាងតម្លៃសេវាកម្ម (Service Price Catalog)"}
              {activeTab === "followup" && "តាមដានការព្យាបាល (Treatment Lifecycle Tracking)"}
              {activeTab === "reports" && "របាយការណ៍ហិរញ្ញវត្ថុ & ចំណូល (Financial Analytics)"}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Firestore Cloud Sync Badge */}
            <button
              onClick={loadClinicData}
              disabled={isSyncingFirestore}
              title="Cloud Firestore Realtime Sync"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
            >
              <Flame className={`w-3.5 h-3.5 text-amber-600 ${isSyncingFirestore ? "animate-bounce" : ""}`} />
              <span>Firestore: Connected</span>
            </button>

            <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full text-xs font-mono text-slate-500 font-semibold hidden sm:block">
              {new Date().toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="System Live" />
          </div>
        </header>

        {/* Dynamic Main Workspace Tab Panels */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* TAB 1: DASHBOARD & QUEUE */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Clinic Statistics KPI Cards */}
              <ClinicStatsCards stats={stats} />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Quick Patient Search & Check-in (4 cols) */}
                <div className="lg:col-span-4">
                  <PatientSearchCheckIn onCheckInSuccess={loadClinicData} />
                </div>

                {/* Right Column: Real-time Patient Queue (8 cols) */}
                <div className="lg:col-span-8">
                  <ActiveQueueTable
                    queue={queue}
                    onRefresh={loadClinicData}
                    onCheckout={(item) => setCheckoutItem(item)}
                  />
                </div>
              </div>

              {/* Quick Recent Transactions Feed under queue */}
              {salesLedger.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        ប្រតិបត្តិការបង់ប្រាក់ចុងក្រោយ (Recent Sales)
                      </h3>
                      <p className="text-[11px] text-slate-400">ប្រវត្តិទូទាត់ប្រាក់ថ្ងៃនេះ</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("reports")}
                      className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      មើលទាំងអស់ →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {salesLedger.slice(0, 3).map((sale) => (
                      <div key={sale.txnId} className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-700">{sale.patientName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{sale.txnId} • {getPaymentMethodKhmer(sale.paymentMethod)}</div>
                        </div>
                        <div className="text-sm font-black font-mono text-emerald-600">
                          +${Number(sale.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: APPOINTMENTS & BOOKING */}
          {activeTab === "booking" && (
            <AppointmentBookingManager onCheckInToQueue={handleCheckInFromAppointment} />
          )}

          {/* TAB 3: SERVICE PRICE CATALOG */}
          {activeTab === "prices" && (
            <ServicePricesManager onPricesUpdated={loadClinicData} />
          )}

          {/* TAB 4: TREATMENT LIFECYCLE TRACKING */}
          {activeTab === "followup" && (
            <TreatmentLifecyclePanel />
          )}

          {/* TAB 5: REPORTS & FINANCIAL ANALYTICS */}
          {activeTab === "reports" && (
            <AnalyticsDashboard />
          )}

        </main>
      </div>

      {/* 3. MODALS */}
      {/* Checkout & Billing Modal */}
      {checkoutItem && (
        <BillingInvoiceModal
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Printable Invoice Modal */}
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

    </div>
  );
}
