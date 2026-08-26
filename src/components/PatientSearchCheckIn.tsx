/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, Phone, UserCheck, Search, PlusCircle, Sparkles } from "lucide-react";
import { Patient } from "../types";
import {
  getFirestoreCollection,
  saveToFirestore,
  checkInPatientDirect,
  COLLECTIONS,
} from "../services/firestoreService";

interface PatientSearchCheckInProps {
  onCheckInSuccess: () => void;
}

export default function PatientSearchCheckIn({ onCheckInSuccess }: PatientSearchCheckInProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [doctor, setDoctor] = useState("Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)");
  const [patientId, setPatientId] = useState("");
  const [suggestions, setSuggestions] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load patients cache for rapid autocomplete
  useEffect(() => {
    getFirestoreCollection<Patient>(COLLECTIONS.PATIENTS).then((pts) => {
      setAllPatients(pts);
    });
  }, []);

  // Handle autocomplete search
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const q = name.trim().toLowerCase();
    const matched = allPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.id.toLowerCase().includes(q)
    );
    setSuggestions(matched);
    setShowDropdown(matched.length > 0);
  }, [name, allPatients]);

  // Click outside suggestions list close helper
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle selection of suggested patient
  const handleSelectPatient = (patient: Patient) => {
    setName(patient.name);
    setPhone(patient.phone);
    setPatientId(patient.id);
    setShowDropdown(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Direct Firestore check-in
      await checkInPatientDirect({
        name: name.trim(),
        phone: phone.trim(),
        doctor,
        patientId: patientId || undefined,
      });

      // Clear form
      setName("");
      setPhone("");
      setDoctor("Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)");
      setPatientId("");
      onCheckInSuccess();
    } catch (error) {
      console.error("Check-in request error:", error);
      alert("មានកំហុសក្នុងការចុះឈ្មោះ។");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="check-in-form-card" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
      <div className="absolute -top-10 -left-10 w-28 h-28 bg-blue-50 rounded-full opacity-30 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              ចុះឈ្មោះ & បញ្ចូលជួរ
            </h2>
            <p className="text-xs text-slate-400">ស្វែងរកអ្នកជំងឺចាស់ ឬចុះឈ្មោះអ្នកជំងឺថ្មី</p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Patient Name input with Auto-complete Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              ឈ្មោះអ្នកជំងឺ
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (patientId) setPatientId(""); // reset if they type
                }}
                required
                placeholder="ឧ. សុខ ចាន់រ៉ាវី..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              {isSearching && (
                <span className="absolute right-3 top-3 text-[10px] text-slate-400 animate-pulse">
                  ស្វែងរក...
                </span>
              )}
            </div>

            {/* Autocomplete Dropdown List */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 z-50 max-h-48 overflow-y-auto">
                <div className="p-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100 bg-slate-50/50 uppercase tracking-wider">
                  អ្នកជំងឺធ្លាប់មកពិនិត្យ ({suggestions.length})
                </div>
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50/70 transition flex items-center justify-between border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <span className="font-bold text-slate-700 block">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.phone}</span>
                    </div>
                    <span className="text-[10px] bg-blue-100/70 text-blue-700 font-mono px-1.5 py-0.5 rounded">
                      {p.id}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Patient ID indicator */}
          {patientId && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-lg border border-emerald-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>អ្នកជំងឺចាស់កូដ: <strong>{patientId}</strong></span>
            </div>
          )}

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              លេខទូរស័ព្ទ
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="ឧ. 012 345 678"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              ទន្តបណ្ឌិតទទួលបន្ទុក
            </label>
            <select
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer font-medium text-slate-700"
            >
              <option value="Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)">
                Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)
              </option>
              <option value="Dr. Chan Sophea (ទន្តបណ្ឌិតទូទៅ)">
                Dr. Chan Sophea (ទន្តបណ្ឌិតទូទៅ)
              </option>
              <option value="Dr. Heng Bunrath (ឯកទេសតម្រង់ធ្មេញ)">
                Dr. Heng Bunrath (ឯកទេសតម្រង់ធ្មេញ)
              </option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs shadow-blue-500/30 transition flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusCircle className="w-4 h-4" />
            {isSubmitting ? "កំពុងបញ្ចូល..." : "ចុះឈ្មោះ & បញ្ចូលជួរភ្លាមៗ"}
          </button>
        </form>
      </div>
    </div>
  );
}
