/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Stethoscope,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarDays,
  UserCheck,
  Check,
  X
} from "lucide-react";
import { Appointment, ServicePrice, Patient } from "../types";
import {
  getFirestoreCollection,
  saveToFirestore,
  deleteFromFirestore,
  COLLECTIONS,
} from "../services/firestoreService";

interface AppointmentBookingManagerProps {
  onCheckInToQueue?: (
    patientName: string,
    phone: string,
    doctor?: string,
    appointmentId?: string
  ) => void;
}

export default function AppointmentBookingManager({
  onCheckInToQueue,
}: AppointmentBookingManagerProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Booking Form State
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00 AM");
  const [doctor, setDoctor] = useState("Dr. Ly MengKheang");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Patient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Success Notification Modal State
  const [createdAppointment, setCreatedAppointment] =
    useState<Appointment | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch initial data from Firestore
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [apptData, pricesData, patientsData] = await Promise.all([
        getFirestoreCollection<Appointment>(COLLECTIONS.APPOINTMENTS),
        getFirestoreCollection<ServicePrice>(COLLECTIONS.PRICES),
        getFirestoreCollection<Patient>(COLLECTIONS.PATIENTS),
      ]);
      setAppointments(apptData);
      setPrices(pricesData.filter((p) => !p.archived));
      setPatients(patientsData);
    } catch (e) {
      console.error("Failed to load appointments data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Autocomplete patient search
  useEffect(() => {
    if (!patientName.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const q = patientName.trim().toLowerCase();
    const matched = patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.id.toLowerCase().includes(q)
    );
    setSuggestions(matched);
    setShowDropdown(matched.length > 0);
  }, [patientName, patients]);

  const handleSelectPatient = (p: Patient) => {
    setPatientName(p.name);
    setPhone(p.phone);
    setShowDropdown(false);
  };

  // Submit new appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !phone.trim() || !service.trim()) {
      alert("សូមបំពេញឈ្មោះ លេខទូរស័ព្ទ និងសេវាកម្ម!");
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = `AP${Math.floor(100000 + Math.random() * 900000)}`;
      const newAppt: Appointment = {
        id: newId,
        patientName: patientName.trim(),
        phone: phone.trim(),
        service: service.trim(),
        date,
        time,
        doctor,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        status: "Scheduled",
      };

      await saveToFirestore(COLLECTIONS.APPOINTMENTS, newAppt);

      setAppointments((prev) => [newAppt, ...prev]);
      setCreatedAppointment(newAppt);
      setShowSuccessModal(true);

      // Reset form
      setPatientName("");
      setPhone("");
      setService("");
      setNotes("");
    } catch (e) {
      console.error("Failed to create appointment:", e);
      alert("មានកំហុសក្នុងការកត់ត្រាការណាត់ជួប។");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (
    id: string,
    newStatus: "Scheduled" | "Confirmed" | "Completed" | "Cancelled"
  ) => {
    try {
      const found = appointments.find((a) => a.id === id);
      if (found) {
        const updated = { ...found, status: newStatus };
        await saveToFirestore(COLLECTIONS.APPOINTMENTS, updated);
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? updated : a))
        );
      }
    } catch (e) {
      console.error("Error updating appointment status:", e);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (window.confirm("តើលោកអ្នកពិតជាចង់លុបការណាត់ជួបនេះមែនទេ?")) {
      try {
        await deleteFromFirestore(COLLECTIONS.APPOINTMENTS, id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
      } catch (e) {
        console.error("Error deleting appointment:", e);
      }
    }
  };

  // Check In direct to Queue
  const handleCheckInNow = async (appt: Appointment) => {
    if (onCheckInToQueue) {
      onCheckInToQueue(appt.patientName, appt.phone, appt.doctor, appt.id);
      handleUpdateStatus(appt.id, "Completed");
    }
  };

  // Filtering
  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.patientName.toLowerCase().includes(q);
      const matchPhone = a.phone.includes(q);
      const matchService = a.service.toLowerCase().includes(q);
      return matchName || matchPhone || matchService;
    }
    return true;
  });

  const todayCount = appointments.filter(
    (a) => a.date === new Date().toISOString().split("T")[0]
  ).length;

  return (
    <div id="appointments-manager-container" className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              🗓️ ប្រព័ន្ធគ្រប់គ្រងការណាត់ជួប (Appointment Booking)
            </h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Brace Studio
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            កក់ទុកមុន កំណត់កាលវិភាគ និងបញ្ជូនអ្នកជំងឺចូលជួរពិនិត្យ (Fast Check-in)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-2xl border border-blue-100 flex items-center gap-2 text-xs font-bold">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>ថ្ងៃនេះមាន: {todayCount} នាក់</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Booking Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">កក់ការណាត់ជួបថ្មី</h3>
              <p className="text-[10px] text-slate-400">បំពេញព័ត៌មានអ្នកជំងឺ និងសេវា</p>
            </div>
          </div>

          <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs">
            {/* Patient Name with Autocomplete */}
            <div className="relative">
              <label className="block font-bold text-slate-600 mb-1">
                ឈ្មោះអ្នកជំងឺ
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="ឧ. សុខ ចាន់រ៉ាវី..."
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 z-50 max-h-40 overflow-y-auto">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex justify-between items-center border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <span className="font-bold text-slate-700 block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.phone}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                        {p.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                លេខទូរស័ព្ទ
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <input
                  type="tel"
                  required
                  placeholder="012 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* Service */}
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                សេវាកម្មព្យាបាល
              </label>
              <input
                list="appointment-services"
                type="text"
                required
                placeholder="ជ្រើសរើស ឬវាយឈ្មោះសេវា..."
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
              <datalist id="appointment-services">
                {prices.map((p) => (
                  <option key={p.id} value={p.name}>
                    ${p.minPrice ?? p.price} ({p.category})
                  </option>
                ))}
              </datalist>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  កាលបរិច្ឆេទ
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  ពេលវេលា
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium"
                >
                  <option value="08:30 AM">08:30 AM</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="01:30 PM">01:30 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                  <option value="05:30 PM">05:30 PM</option>
                </select>
              </div>
            </div>

            {/* Dentist */}
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                ទន្តបណ្ឌិត
              </label>
              <select
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium text-slate-700"
              >
                <option value="Dr. Ly MengKheang">Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)</option>
                <option value="Dr. Chan Sophea">Dr. Chan Sophea (ទន្តបណ្ឌិតទូទៅ)</option>
                <option value="Dr. Heng Bunrath">Dr. Heng Bunrath (ឯកទេសតម្រង់ធ្មេញ)</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                កំណត់សម្គាល់ (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="ចំណាំបន្ថែមអំពីអាការៈ ឬការណាត់..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "កំពុងកត់ត្រា..." : "កត់ត្រាការណាត់ជួប"}</span>
            </button>
          </form>
        </div>

        {/* 3. Appointments List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                កាលវិភាគណាត់ជួប ({filteredAppointments.length})
              </h3>
              <p className="text-[10px] text-slate-400">គ្រប់គ្រង និងបញ្ជូនចូលជួរពិនិត្យ</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                {(["All", "Scheduled", "Confirmed", "Completed"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 font-bold rounded-lg transition cursor-pointer text-[11px] ${
                      statusFilter === st
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {st === "All"
                      ? "ទាំងអស់"
                      : st === "Scheduled"
                      ? "បានកំណត់"
                      : st === "Confirmed"
                      ? "បានបញ្ជាក់"
                      : "បានពិនិត្យ"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ស្វែងរកតាមឈ្មោះអ្នកជំងឺ, លេខទូរស័ព្ទ, ឬសេវាកម្ម..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
          </div>

          <div className="space-y-3">
            {filteredAppointments.map((appt) => {
              const isToday = appt.date === new Date().toISOString().split("T")[0];
              const isConfirmed = appt.status === "Confirmed";
              const isCompleted = appt.status === "Completed";
              const isCancelled = appt.status === "Cancelled";

              return (
                <div
                  key={appt.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    isToday
                      ? "bg-blue-50/40 border-blue-200"
                      : "bg-slate-50/50 border-slate-200/80"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">
                        {appt.patientName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {appt.phone}
                      </span>
                      {isToday && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                          ថ្ងៃនេះ
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-blue-700">
                        🦷 {appt.service}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {appt.date} ({appt.time})
                      </span>
                      <span className="text-slate-400">| {appt.doctor}</span>
                    </div>

                    {appt.notes && (
                      <p className="text-[11px] text-slate-400 italic">
                        "{appt.notes}"
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    {!isCompleted && !isCancelled && (
                      <>
                        <button
                          onClick={() => handleCheckInNow(appt)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="បញ្ជូនចូលជួរពិនិត្យភ្លាមៗ"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Check-in ចូលជួរ</span>
                        </button>

                        {!isConfirmed ? (
                          <button
                            onClick={() => handleUpdateStatus(appt.id, "Confirmed")}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer"
                          >
                            បញ្ជាក់ (Confirm)
                          </button>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 text-[10px] font-bold px-2 py-1 rounded-lg border border-emerald-200">
                            ✓ បានបញ្ជាក់
                          </span>
                        )}
                      </>
                    )}

                    {isCompleted && (
                      <span className="text-slate-400 text-xs font-medium">
                        ✓ បានពិនិត្យរួចរាល់
                      </span>
                    )}

                    <button
                      onClick={() => handleDelete(appt.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="លុបការណាត់"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredAppointments.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic text-xs">
                គ្មានការណាត់ជួបត្រូវនឹងលក្ខខណ្ឌនេះឡើយ។
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Modal */}
      {showSuccessModal && createdAppointment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                កក់ការណាត់ជួបបានជោគជ័យ!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                លេខកូដណាត់: <strong className="font-mono text-slate-700">{createdAppointment.id}</strong>
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-left text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">អ្នកជំងឺ:</span>
                <span className="font-bold text-slate-700">{createdAppointment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">សេវាកម្ម:</span>
                <span className="font-bold text-blue-600">{createdAppointment.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">កាលបរិច្ឆេទ:</span>
                <span className="font-medium text-slate-700">{createdAppointment.date} ({createdAppointment.time})</span>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
