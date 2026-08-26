/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, Phone, UserCheck, Search, PlusCircle, Sparkles } from "lucide-react";
import { Patient } from "../types";

interface PatientSearchCheckInProps {
  onCheckInSuccess: () => void;
}

export default function PatientSearchCheckIn({ onCheckInSuccess }: PatientSearchCheckInProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [doctor, setDoctor] = useState("Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)");
  const [patientId, setPatientId] = useState("");
  const [suggestions, setSuggestions] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle autocomplete search
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/patients?query=${encodeURIComponent(name)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        console.error("Autocomplete search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [name]);

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

  // Handle selection of suggest patient
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
      const response = await fetch("/api/queue/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          doctor,
          patientId,
        }),
      });

      if (response.ok) {
        // Clear form
        setName("");
        setPhone("");
        setDoctor("Dr. Ly MengKheang (គ្រូពេទ្យបង្គោល)");
        setPatientId("");
        onCheckInSuccess();
      } else {
        alert("ការចុះឈ្មោះមិនបានសម្រេច។ សូមព្យាយាមម្តងទៀត។");
      }
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
                placeholder="វាយឈ្មោះដើម្បីស្វែងរក..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition text-sm text-slate-700 bg-slate-50/50"
                autoComplete="off"
              />
              {isSearching && (
                <span className="absolute right-3.5 top-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* suggestions list dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div id="patient-search-dropdown" className="absolute z-50 left-0 right-0 top-[102%] bg-white border border-slate-100 rounded-xl shadow-lg divide-y divide-slate-150 overflow-hidden max-h-52 overflow-y-auto">
                <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  អ្នកជំងឺចាស់ដែលត្រូវគ្នា
                </div>
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50/50 flex items-center justify-between text-xs text-slate-700 transition"
                  >
                    <div>
                      <span className="font-semibold block text-slate-800">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">លេខកូដ: {p.id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">{p.phone}</span>
                      <span className="text-[10px] font-medium text-blue-500">{p.visitsCount || 0} ដង</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Patient Phone Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              លេខទូរស័ព្ទ
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="ឧ. +855 12 345 678"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition text-sm text-slate-700 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Doctor Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              គ្រូពេទ្យទទួលបន្ទុក
            </label>
            <input
              type="text"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="វាយឈ្មោះគ្រូពេទ្យទទួលបន្ទុក..."
              required
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition text-sm text-slate-700 bg-slate-50/50"
            />
          </div>

          {/* Submit Check-In button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition duration-200 text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            បញ្ចូលទៅក្នុងបញ្ជីរង់ចាំ
          </button>
        </form>
      </div>
    </div>
  );
}
