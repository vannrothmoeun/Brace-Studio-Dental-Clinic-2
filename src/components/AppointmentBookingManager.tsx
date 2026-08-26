import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  FileText,
  Send,
  ExternalLink,
  Settings,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bookmark,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  CalendarDays,
  UserCheck,
  RefreshCw,
  X
} from "lucide-react";
import { Appointment, ServicePrice, Patient } from "../types";
import { saveToFirestore, deleteFromFirestore, COLLECTIONS } from "../services/firestoreService";

interface AppointmentBookingManagerProps {
  onCheckInToQueue?: (
    patientName: string,
    phone: string,
    doctor?: string,
    appointmentId?: string
  ) => void;
}

const DEFAULT_CALENDAR_EMBED =
  "https://calendar.google.com/calendar/embed?src=7079cc6bc709dbe24f08c9042e1769dfb8b0b324a33a0f1e17dcd00be862e055%40group.calendar.google.com&ctz=UTC";

const DEFAULT_CALENDAR_URL =
  "https://calendar.google.com/calendar/u/0/r?cid=7079cc6bc709dbe24f08c9042e1769dfb8b0b324a33a0f1e17dcd00be862e055@group.calendar.google.com";

const LOCAL_STORAGE_WEBHOOK_KEY = "MENGKHEANG_GAS_WEBHOOK_URL";

// Available time slots with Khmer display labels
export const KHMER_TIME_SLOTS = [
  "08:00 ព្រឹក",
  "08:30 ព្រឹក",
  "09:00 ព្រឹក",
  "09:30 ព្រឹក",
  "10:00 ព្រឹក",
  "10:30 ព្រឹក",
  "11:00 ព្រឹក",
  "11:30 ព្រឹក",
  "01:30 រសៀល",
  "02:00 រសៀល",
  "02:30 រសៀល",
  "03:00 រសៀល",
  "03:30 រសៀល",
  "04:00 រសៀល",
  "04:30 រសៀល",
  "05:00 ល្ងាច",
  "05:30 ល្ងាច",
  "06:00 ល្ងាច",
  "06:30 យប់",
  "07:00 យប់",
  "07:30 យប់",
];

// Helper to convert any Khmer/localized time string to standard 24-hour "HH:mm" format
export function convertKhmerTimeTo24H(rawTime: string): string {
  if (!rawTime) return "09:00";
  const str = rawTime.trim();

  // If already standard 24H HH:mm format (e.g. "14:00", "09:30")
  if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(str)) {
    const [h, m] = str.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }

  // Extract digits
  const match = str.match(/(\d{1,2})[:.]?(\d{2})?/);
  if (!match) return "09:00";

  let hours = parseInt(match[1], 10);
  const minutes = match[2] || "00";

  // Check for PM/afternoon indicators in Khmer & English
  const isPM = /រសៀល|ល្ងាច|យប់|pm/i.test(str);
  const isAM = /ព្រឹក|am/i.test(str);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

export default function AppointmentBookingManager({
  onCheckInToQueue,
}: AppointmentBookingManagerProps) {
  // Form State
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("កោសកំបោរធ្មេញ");
  const [doctor, setDoctor] = useState("ទន្តបណ្ឌិត លី ម៉េងឃាង");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [time, setTime] = useState("09:30 ព្រឹក");
  const [notes, setNotes] = useState("");

  // Appointments list & auxiliary data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [servicesList, setServicesList] = useState<ServicePrice[]>([]);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Notification & Confirmation Modal
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
    webhookSuccess?: boolean;
    appointmentData?: Appointment;
  } | null>(null);

  // Webhook settings modal
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_WEBHOOK_KEY) || "";
  });
  const [tempWebhookUrl, setTempWebhookUrl] = useState("");

  // SMS draft copy state
  const [smsCopied, setSmsCopied] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<"all" | "today" | "upcoming">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Patient Auto-suggestions
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchAppointments();
    fetchServicesAndPatients();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServicesAndPatients = async () => {
    try {
      const [resPrices, resPatients] = await Promise.all([
        fetch("/api/prices"),
        fetch("/api/patients"),
      ]);
      if (resPrices.ok) {
        const data = await resPrices.json();
        setServicesList(data.filter((p: ServicePrice) => !p.archived));
      }
      if (resPatients.ok) {
        const data = await resPatients.json();
        setPatientsList(data);
      }
    } catch (e) {
      console.error("Error fetching auxiliary data:", e);
    }
  };

  // Autocomplete patient search
  const handleNameChange = (val: string) => {
    setPatientName(val);
    if (val.trim().length > 0) {
      const q = val.toLowerCase();
      const matches = patientsList.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.phone.replace(/\s+/g, "").includes(q)
      );
      setFilteredPatients(matches.slice(0, 5));
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectPatient = (p: Patient) => {
    setPatientName(p.name);
    setPhone(p.phone);
    setShowSuggestions(false);
  };

  // Quick Date Selectors
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(d.toISOString().split("T")[0]);
  };

  // Quick Time Slots (Khmer)
  const quickTimeSlots = [
    "08:30 ព្រឹក",
    "09:30 ព្រឹក",
    "10:30 ព្រឹក",
    "11:30 ព្រឹក",
    "02:00 រសៀល",
    "03:30 រសៀល",
    "05:00 ល្ងាច",
    "06:30 យប់",
  ];

  // Save Webhook Settings
  const handleSaveWebhook = () => {
    const trimmed = tempWebhookUrl.trim();
    localStorage.setItem(LOCAL_STORAGE_WEBHOOK_KEY, trimmed);
    setWebhookUrl(trimmed);
    setShowWebhookModal(false);
    setNotification({
      show: true,
      type: "success",
      title: "រក្សាទុក Webhook រួចរាល់",
      message: trimmed
        ? "តំណភ្ជាប់ Webhook ត្រូវបានកំណត់ជោគជ័យ!"
        : "Webhook URL ត្រូវបានជម្រះ។",
    });
  };

  // Submit Booking Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setNotification({
        show: true,
        type: "error",
        title: "ខ្វះឈ្មោះអ្នកជំងឺ",
        message: "សូមបញ្ចូលឈ្មោះអ្នកជំងឺជាមុនសិន។",
      });
      return;
    }
    if (!date || !time) {
      setNotification({
        show: true,
        type: "error",
        title: "ខ្វះកាលបរិច្ឆេទ ឬម៉ោង",
        message: "សូមជ្រើសរើសថ្ងៃ និងម៉ោងណាត់ជួប។",
      });
      return;
    }

    setIsSubmitting(true);
    let createdAppointment: Appointment | null = null;
    let webhookSent = false;
    let webhookErrorMsg = "";

    try {
      const time24H = convertKhmerTimeTo24H(time);

      // 1. Save to local server database
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName.trim(),
          phone: phone.trim(),
          service,
          date,
          time,
          doctor,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("បរាជ័យក្នុងការរក្សាទុកការណាត់ក្នុងប្រព័ន្ធ");
      }

      createdAppointment = await res.json();

      // 2. Trigger Google Apps Script Webhook if configured
      const currentWebhookUrl = localStorage.getItem(LOCAL_STORAGE_WEBHOOK_KEY) || webhookUrl;
      if (currentWebhookUrl && currentWebhookUrl.startsWith("http")) {
        try {
          const webhookPayload = {
            action: "NEW_APPOINTMENT",
            id: createdAppointment?.id,
            patientName: patientName.trim(),
            phone: phone.trim(),
            service,
            date,
            time: time24H, // Standard 24-hour format (e.g. '10:30', '14:00') to prevent 'Invalid Date' in Apps Script
            timeKhmer: time, // Khmer display format (e.g. '10:30 ព្រឹក', '02:00 រសៀល')
            doctor,
            notes: notes.trim(),
            createdAt: new Date().toISOString(),
            source: "MengKheang Dental Clinic System",
          };

          // Try standard JSON POST, fallback gracefully to no-cors mode if needed
          await fetch(currentWebhookUrl, {
            method: "POST",
            mode: "no-cors",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
          });
          webhookSent = true;
        } catch (webhookErr: any) {
          console.warn("Webhook POST error:", webhookErr);
          webhookErrorMsg = "មិនអាចបញ្ជូនទៅ Webhook បានទេ ប៉ុន្តែទិន្នន័យបានរក្សាទុកក្នុងប្រព័ន្ធរួចរាល់។";
        }
      }

      // Update state
      if (createdAppointment) {
        setAppointments((prev) => [createdAppointment!, ...prev]);
        // Direct save to Cloud Firestore
        saveToFirestore(COLLECTIONS.APPOINTMENTS, createdAppointment).catch(() => {});
      }

      // Show confirmation notification modal
      setNotification({
        show: true,
        type: "success",
        title: "ការកក់ការណាត់ជួបបានជោគជ័យ! 🎉",
        message: webhookSent
          ? "បានរក្សាទុកការណាត់ជួប និងបញ្ជូនព័ត៌មានទៅ Webhook ដោយស្វ័យប្រវត្តិ។"
          : currentWebhookUrl
          ? (webhookErrorMsg || "បានរក្សាទុកការណាត់ជួបក្នុងប្រព័ន្ធ។")
          : "បានរក្សាទុកការណាត់ជួបក្នុងប្រព័ន្ធរួចរាល់ (លោកគ្រូអាចកំណត់ Webhook ដើម្បីបញ្ជូនទិន្នន័យស្វ័យប្រវត្តិ)។",
        webhookSuccess: webhookSent,
        appointmentData: createdAppointment || undefined,
      });

      // Clear non-persistent form fields
      setPatientName("");
      setPhone("");
      setNotes("");
    } catch (err: any) {
      console.error("Booking error:", err);
      setNotification({
        show: true,
        type: "error",
        title: "មានបញ្ហាក្នុងការកក់",
        message: err.message || "មិនអាចបង្កើតការណាត់ជួបបានទេ។ សូមព្យាយាមម្ដងទៀត។",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: Appointment["status"]) => {
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
        const updated = appointments.find((a) => a.id === id);
        if (updated) {
          saveToFirestore(COLLECTIONS.APPOINTMENTS, { ...updated, status: newStatus }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("Error updating appointment status:", e);
    }
  };

  // Delete Appointment
  const handleDelete = async (id: string) => {
    if (!confirm("តើលោកគ្រូពិតជាចង់លុបការណាត់ជួបនេះមែនទេ?")) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        deleteFromFirestore(COLLECTIONS.APPOINTMENTS, id).catch(() => {});
      }
    } catch (e) {
      console.error("Error deleting appointment:", e);
    }
  };

  // Filter Appointments
  const filteredAppointments = appointments.filter((app) => {
    const matchesSearch =
      app.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery) ||
      app.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDateFilter === "today") {
      return app.date === todayStr;
    }
    if (selectedDateFilter === "upcoming") {
      return app.date >= todayStr;
    }
    return true;
  });

  // SMS Draft text in pure Khmer
  const currentSmsDraft = `ជម្រាបសួរលោក/លោកស្រី ${patientName || "[ឈ្មោះអ្នកជំងឺ]"}! នេះជាសារបញ្ជាក់ការណាត់ជួបពិនិត្យធ្មេញ [${service || "សេវាកម្មធ្មេញ"}] នៅ Brace Studio Dental Clinic នៅថ្ងៃទី ${date || "[ថ្ងៃ]"} ម៉ោង ${time || "[ម៉ោង]"} ជាមួយ ${doctor}។ សូមអរគុណ!`;

  const handleCopySms = () => {
    navigator.clipboard.writeText(currentSmsDraft);
    setSmsCopied(true);
    setTimeout(() => setSmsCopied(false), 2500);
  };

  return (
    <div id="native-booking-stage" className="space-y-6">
      
      {/* Header Bar with Action & Google Calendar Shortcut */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              ប្រព័ន្ធគ្រប់គ្រងការកក់ការណាត់ជួប
            </h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Brace Studio Dental Clinic
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ទម្រង់កក់ការណាត់ផ្ទាល់ខ្លួន បញ្ជូនទិន្នន័យស្វ័យប្រវត្ត និងតភ្ជាប់ជាមួយប្រតិទិនការងារ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Google Calendar Shortcut Button */}
          <a
            href={DEFAULT_CALENDAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition border border-blue-200 shadow-2xs cursor-pointer"
            title="បើកមើលក្នុងប្រតិទិនផ្ទាល់"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span>បើកប្រតិទិនការងារ ↗</span>
          </a>

          {/* Webhook Configuration Button */}
          <button
            onClick={() => {
              setTempWebhookUrl(webhookUrl);
              setShowWebhookModal(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border shadow-2xs cursor-pointer ${
              webhookUrl
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
            title="កំណត់ Webhook URL"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{webhookUrl ? "Webhook សកម្ម ✓" : "កំណត់ Webhook"}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Native Form, Right Calendar & Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: Native Dental Booking Form */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-5 relative">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  ទម្រង់កក់ការណាត់ជួបថ្មី
                </h3>
                <p className="text-[11px] text-slate-400">
                  បំពេញព័ត៌មានអ្នកជំងឺ និងកំណត់កាលវិភាគណាត់
                </p>
              </div>
            </div>

            {webhookUrl ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ភ្ជាប់ Webhook រួចរាល់
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                រក្សាទុកក្នុងប្រព័ន្ធ
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Patient Name with Auto-suggestion */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ឈ្មោះអ្នកជំងឺ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => {
                    if (patientName.trim().length > 0) setShowSuggestions(true);
                  }}
                  placeholder="ឧ. សុខ ចាន់រ៉ាវី ឬ មាស សុភាព..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredPatients.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-100">
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400">
                    អ្នកជំងឺដែលមានក្នុងប្រព័ន្ធ
                  </div>
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="w-full px-3.5 py-2 text-left hover:bg-blue-50 transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="font-bold text-slate-700">{p.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                លេខទូរស័ព្ទ
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ឧ. 012 345 678..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Dental Service Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                សេវាកម្មព្យាបាលធ្មេញ <span className="text-rose-500">*</span>
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-hidden cursor-pointer"
              >
                {servicesList.length > 0 ? (
                  servicesList.map((s) => {
                    const min = s.minPrice !== undefined ? s.minPrice : s.price;
                    const max = s.maxPrice !== undefined ? s.maxPrice : s.price;
                    const rangeLabel = min !== max ? `$${min.toFixed(2)} – $${max.toFixed(2)}` : `$${min.toFixed(2)}`;
                    return (
                      <option key={s.id} value={`${s.name} (${rangeLabel})`}>
                        {s.name} — {rangeLabel}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="កោសកំបោរធ្មេញ ($20.00 – $30.00)">កោសកំបោរធ្មេញ — $20.00 – $30.00</option>
                    <option value="ប៉ះធ្មេញ ($30.00 – $50.00)">ប៉ះធ្មេញ — $30.00 – $50.00</option>
                    <option value="ដកធ្មេញ ($30.00 – $60.00)">ដកធ្មេញ — $30.00 – $60.00</option>
                    <option value="ព្យាបាលឫសធ្មេញ ($80.00 – $150.00)">ព្យាបាលឫសធ្មេញ — $80.00 – $150.00</option>
                    <option value="ស្រោបធ្មេញ ($120.00 – $180.00)">ស្រោបធ្មេញ — $120.00 – $180.00</option>
                    <option value="បាញ់កាំរស្មីធ្មេញស ($150.00 – $220.00)">បាញ់កាំរស្មីធ្មេញស — $150.00 – $220.00</option>
                    <option value="ដាំបង្គោលធ្មេញ">ដាំបង្គោលធ្មេញ</option>
                    <option value="ពិគ្រោះយោបល់ទូទៅ ($15.00)">ពិគ្រោះយោបល់ទូទៅ — $15.00</option>
                  </>
                )}
              </select>
            </div>

            {/* Doctor in charge */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ទន្តបណ្ឌិតទទួលបន្ទុក
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  placeholder="ទន្តបណ្ឌិត លី ម៉េងឃាង"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                />
                <UserCheck className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
              </div>
            </div>

            {/* Date & Quick Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  កាលបរិច្ឆេទណាត់ជួប <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-md font-semibold transition cursor-pointer"
                  >
                    ថ្ងៃនេះ
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-md font-semibold transition cursor-pointer"
                  >
                    ថ្ងៃស្អែក
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-md font-semibold transition cursor-pointer"
                  >
                    ២ ថ្ងៃទៀត
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                />
                <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Time Selection Dropdown & Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  ម៉ោងណាត់ជួប <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  ទម្រង់ ២៤ ម៉ោង: <strong className="text-indigo-600">{convertKhmerTimeTo24H(time)}</strong>
                </span>
              </div>
              <div className="relative mb-2">
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-hidden cursor-pointer"
                >
                  {KHMER_TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot} ({convertKhmerTimeTo24H(slot)})
                    </option>
                  ))}
                </select>
                <Clock className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
              </div>
              
              {/* Quick Time Selection Chips */}
              <div className="flex flex-wrap gap-1.5">
                {["08:30 ព្រឹក", "09:30 ព្រឹក", "10:30 ព្រឹក", "11:30 ព្រឹក", "02:00 រសៀល", "03:30 រសៀល", "05:00 ល្ងាច", "06:30 យប់"].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTime(slot)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      time === slot
                        ? "bg-blue-600 text-white shadow-2xs font-bold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                កំណត់សម្គាល់បន្ថែម
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ឧ. រោគសញ្ញាឈឺធ្មេញ ធ្លាប់ព្យាបាលពីមុន ឬការណែនាំពិសេស..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-hidden resize-none"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>កំពុងដំណើរការកក់...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>កក់ការណាត់ជួប និងបញ្ជូនទិន្នន័យ</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* RIGHT PANEL: Embedded Calendar & SMS Reminder Tool */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Calendar Stage */}
          <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs h-[520px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800">
                  ប្រតិទិនណាត់ជួបផ្ទាល់
                </h3>
              </div>
              <a
                href={DEFAULT_CALENDAR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
              >
                បើកពេញផ្ទាំង
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex-1 overflow-hidden relative rounded-2xl border border-slate-200 bg-slate-50">
              <iframe
                src={DEFAULT_CALENDAR_EMBED}
                width="100%"
                height="100%"
                className="border-0"
                scrolling="no"
                title="តារាងណាត់ជួបគ្លីនិកធ្មេញ លី ម៉េងឃាង"
              >
                កំពុងដំណើរការ...
              </iframe>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>តំបន់ម៉ោង៖ ភ្នំពេញ (GMT+7)</span>
              <span className="font-semibold text-slate-500">គ្លីនិកធ្មេញ លី ម៉េងឃាង</span>
            </div>
          </div>

          {/* Booking Confirmation SMS & Telegram Draft Co-pilot */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-5 rounded-3xl border border-blue-150 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-blue-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-blue-600" />
                សាររំលឹកការណាត់ជួប
              </h4>
              <button
                type="button"
                onClick={handleCopySms}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {smsCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ចម្លងរួច!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>ចម្លងសារ</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-normal">
              លោកគ្រូ ឬបុគ្គលិកអាចចម្លងសារនេះផ្ញើជូនអ្នកជំងឺតាម Telegram ឬ SMS ភ្លាមៗ៖
            </p>

            <div className="bg-white p-3.5 rounded-2xl border border-blue-200 text-slate-700 select-all font-sans leading-relaxed text-xs shadow-2xs">
              {currentSmsDraft}
            </div>
          </div>

        </div>

      </div>

      {/* RECENT APPOINTMENTS LIST TABLE */}
      <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              បញ្ជីការណាត់ជួបទាំងអស់
            </h3>
            <p className="text-[11px] text-slate-400">
              សរុប {appointments.length} ការណាត់ជួបត្រូវបានកត់ត្រាក្នុងប្រព័ន្ធ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកឈ្មោះ ឬលេខទូរស័ព្ទ..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedDateFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedDateFilter === "all"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ទាំងអស់ ({appointments.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter("today")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedDateFilter === "today"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ថ្ងៃនេះ
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter("upcoming")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedDateFilter === "upcoming"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ខាងមុខ
              </button>
            </div>

            <button
              onClick={fetchAppointments}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
              title="ផ្ទុកទិន្នន័យឡើងវិញ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400">
                <th className="py-3 px-3">លេខកូដ</th>
                <th className="py-3 px-3">ឈ្មោះអ្នកជំងឺ & ទូរស័ព្ទ</th>
                <th className="py-3 px-3">សេវាកម្ម</th>
                <th className="py-3 px-3">ថ្ងៃ & ម៉ោងណាត់</th>
                <th className="py-3 px-3">ទន្តបណ្ឌិត</th>
                <th className="py-3 px-3">ស្ថានភាព</th>
                <th className="py-3 px-3 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    មិនមានការណាត់ជួបដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកនេះទេ។
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-blue-600 text-[11px]">
                      {app.id}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{app.patientName}</div>
                      {app.phone && (
                        <div className="text-[11px] text-slate-400 font-mono">{app.phone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      <div>{app.service}</div>
                      {app.notes && (
                        <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                          {app.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{app.date}</div>
                      <div className="text-[11px] text-indigo-600 font-bold">{app.time}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">
                      {app.doctor || "ទន្តបណ្ឌិត លី ម៉េងឃាង"}
                    </td>
                    <td className="py-3.5 px-3">
                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleUpdateStatus(app.id, e.target.value as Appointment["status"])
                        }
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border outline-hidden cursor-pointer ${
                          app.status === "Completed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : app.status === "Cancelled"
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <option value="Scheduled">បានកក់</option>
                        <option value="Completed">បានបញ្ចប់</option>
                        <option value="Cancelled">លុបចោល</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onCheckInToQueue && app.status !== "Completed" && (
                          <button
                            type="button"
                            onClick={() =>
                              onCheckInToQueue(app.patientName, app.phone, app.doctor, app.id)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] transition cursor-pointer shadow-2xs active:scale-95"
                            title="ចុះឈ្មោះអ្នកជំងឺចូលក្នុងជួរពិនិត្យផ្ទាល់ (Check-in to Live Queue)"
                          >
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            ចុះឈ្មោះចូលពិនិត្យ
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="លុបការណាត់ជួប"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* --- NOTIFICATION & CONFIRMATION MODAL --- */}
      {notification && notification.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner bg-emerald-100 text-emerald-600">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : notification.type === "error" ? (
                <AlertCircle className="w-7 h-7 text-rose-600" />
              ) : (
                <Sparkles className="w-7 h-7 text-blue-600" />
              )}
            </div>

            <div>
              <h3 className="text-base font-black text-slate-800">
                {notification.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {notification.message}
              </p>
            </div>

            {/* Quick appointment summary card */}
            {notification.appointmentData && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">លេខកូដ៖</span>
                  <span className="font-mono font-bold text-blue-600">{notification.appointmentData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">អ្នកជំងឺ៖</span>
                  <span className="font-bold text-slate-800">{notification.appointmentData.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">កាលបរិច្ឆេទ & ម៉ោង៖</span>
                  <span className="font-bold text-indigo-600">{notification.appointmentData.date} | {notification.appointmentData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">សេវាកម្ម៖</span>
                  <span className="font-medium text-slate-700">{notification.appointmentData.service}</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                យល់ព្រម
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GOOGLE APPS SCRIPT WEBHOOK CONFIGURATION MODAL --- */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                កំណត់ Webhook សម្រាប់បញ្ជូនទិន្នន័យ (Google Apps Script)
              </h3>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <p>
                នៅពេលលោកគ្រូ ឬបុគ្គលិកចុចកក់ការណាត់ជួប ប្រព័ន្ធនឹងផ្ញើទិន្នន័យទៅកាន់ Webhook URL នេះដោយស្វ័យប្រវត្តិដើម្បីកត់ត្រាក្នុង Google Sheets ឬ Google Calendar៖
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  តំណភ្ជាប់ Web App URL (Google Apps Script)
                </label>
                <input
                  type="url"
                  value={tempWebhookUrl}
                  onChange={(e) => setTempWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden"
                />
              </div>

              <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-150 text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  💡 គំរូទិន្នន័យដែល Webhook ទទួល៖
                </div>
                <pre className="font-mono text-[10px] bg-white p-2 rounded-lg border border-blue-100 overflow-x-auto text-slate-700">
{`{
  "action": "NEW_APPOINTMENT",
  "id": "AP401824",
  "patientName": "សុខ ចាន់រ៉ាវី",
  "phone": "012 345 678",
  "service": "ព្យាបាលឫសធ្មេញ",
  "date": "2026-08-25",
  "time": "09:30",
  "timeKhmer": "09:30 ព្រឹក",
  "doctor": "ទន្តបណ្ឌិត លី ម៉េងឃាង",
  "notes": "តាមដានការព្យាបាលលើកទី២",
  "createdAt": "2026-08-24T19:00:00Z"
}`}
                </pre>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  រក្សាទុកការកំណត់
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
