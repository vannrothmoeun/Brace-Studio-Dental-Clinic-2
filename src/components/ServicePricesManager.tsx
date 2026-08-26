/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Archive, RotateCcw, DollarSign, Sparkles, Tag, Layers, RefreshCw, SlidersHorizontal, ArrowRight } from "lucide-react";
import { ServicePrice } from "../types";

interface ServicePricesManagerProps {
  onPricesUpdated?: () => void;
}

export default function ServicePricesManager({ onPricesUpdated }: ServicePricesManagerProps) {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  
  // Form state
  const [name, setName] = useState("");
  const [priceType, setPriceType] = useState<"fixed" | "range">("fixed");
  const [fixedPrice, setFixedPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [category, setCategory] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPrices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/prices");
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let payloadMin: number;
    let payloadMax: number;

    if (priceType === "fixed") {
      if (!fixedPrice) return;
      payloadMin = Number(fixedPrice);
      payloadMax = Number(fixedPrice);
    } else {
      if (!minPrice) return;
      payloadMin = Number(minPrice);
      payloadMax = maxPrice ? Number(maxPrice) : payloadMin;
      if (payloadMax < payloadMin) {
        alert("តម្លៃខ្ពស់បំផុត (Max Price) មិនអាចតូចជាងតម្លៃទាបបំផុត (Min Price) បានឡើយ។");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: payloadMin,
          minPrice: payloadMin,
          maxPrice: payloadMax,
          category,
        }),
      });

      if (response.ok) {
        setName("");
        setFixedPrice("");
        setMinPrice("");
        setMaxPrice("");
        setCategory("General");
        fetchPrices();
        if (onPricesUpdated) onPricesUpdated();
      } else {
        alert("មិនអាចបន្ថែមមុខសេវាកម្មបានទេ។");
      }
    } catch (error) {
      console.error("Add service error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveService = async (id: string) => {
    if (!confirm("តើអ្នកពិតជាចង់ដាក់សេវាកម្មនេះទៅក្នុងប័ណ្ណសារមែនទេ? (សេវាកម្មក្នុងប័ណ្ណសារនឹងមិនបង្ហាញសម្រាប់ការចេញវិក្កយបត្រថ្មីទេ)")) return;

    try {
      const response = await fetch(`/api/prices/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPrices();
        if (onPricesUpdated) onPricesUpdated();
      } else {
        alert("មិនអាចដាក់សេវាកម្មចូលក្នុងប័ណ្ណសារបានទេ។");
      }
    } catch (error) {
      console.error("Archive service error:", error);
    }
  };

  const handleRestoreService = async (id: string) => {
    try {
      const response = await fetch(`/api/prices/${id}/restore`, {
        method: "POST",
      });

      if (response.ok) {
        fetchPrices();
        if (onPricesUpdated) onPricesUpdated();
      } else {
        alert("មិនអាចទាញយកសេវាកម្មពីប័ណ្ណសារមកវិញបានទេ។");
      }
    } catch (error) {
      console.error("Restore service error:", error);
    }
  };

  const formatPriceDisplay = (p: ServicePrice) => {
    const min = p.minPrice !== undefined ? p.minPrice : p.price;
    const max = p.maxPrice !== undefined ? p.maxPrice : p.price;

    if (min !== max) {
      return (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-blue-600">
            ${min.toFixed(2)} – ${max.toFixed(2)}
          </span>
          <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-semibold w-fit">
            ចន្លោះតម្លៃ
          </span>
        </div>
      );
    }
    return <span className="font-mono font-bold text-slate-800">${min.toFixed(2)}</span>;
  };

  const activePrices = prices.filter((p) => !p.archived);
  const displayedPrices = filterCategory === "All" 
    ? activePrices 
    : activePrices.filter((p) => (p.category || "General") === filterCategory);

  const categories = ["All", ...Array.from(new Set(activePrices.map((p) => p.category || "General")))];

  return (
    <div id="prices-manager-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Add New Service Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">បន្ថែមសេវាកម្មថ្មី</h3>
            <p className="text-[11px] text-slate-400">កំណត់តម្លៃថេរ ឬចន្លោះតម្លៃ (Price Range)</p>
          </div>
        </div>

        <form onSubmit={handleAddService} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              ឈ្មោះសេវាកម្មព្យាបាល <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Tag className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="ឧ. ព្យាបាលឫសធ្មេញ (Root Canal)"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-hidden transition text-xs text-slate-700 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Pricing Model Tabs: Fixed vs Range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              ទម្រង់តម្លៃ (Pricing Type)
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPriceType("fixed")}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  priceType === "fixed"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                តម្លៃថេរ (Fixed)
              </button>
              <button
                type="button"
                onClick={() => setPriceType("range")}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  priceType === "range"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                ចន្លោះតម្លៃ (Range)
              </button>
            </div>
          </div>

          {priceType === "fixed" ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                តម្លៃ ($ USD) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  required
                  placeholder="50.00"
                  className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-hidden transition text-xs font-bold text-slate-700 bg-slate-50/50"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/60">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    ចាប់ពី ($ Min) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      required
                      placeholder="80.00"
                      className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-hidden text-xs font-bold bg-white text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    ដល់ ($ Max) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      required
                      placeholder="150.00"
                      className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-hidden text-xs font-bold bg-white text-slate-800"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-blue-700 font-medium">
                💡 ឧទាហរណ៍៖ ព្យាបាលឫសធ្មេញពី <strong>$80</strong> ទៅ <strong>$150</strong> អាស្រ័យលើកម្រិតធ្ងន់ធ្ងរ។
              </p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              ប្រភេទសេវាកម្ម (Category)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-hidden text-xs text-slate-700 bg-slate-50/50 cursor-pointer"
            >
              <option value="General">General (ទូទៅ)</option>
              <option value="Preventive">Preventive (បង្ការ / សម្អាត)</option>
              <option value="Restorative">Restorative (ប៉ះធ្មេញ)</option>
              <option value="Endodontic">Endodontic (ព្យាបាលឫស)</option>
              <option value="Surgical">Surgical (ដកធ្មេញ / វះកាត់)</option>
              <option value="Prosthetic">Prosthetic (ស្រោប / ដាក់ធ្មេញ)</option>
              <option value="Cosmetic">Cosmetic (កែសម្ផស្ស / បាញ់ធ្មេញស)</option>
              <option value="Consultation">Consultation (ពិគ្រោះយោបល់)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            រក្សាទុកសេវាកម្ម
          </button>
        </form>
      </div>

      {/* Services List Panel */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">តារាងតម្លៃព្យាបាលធ្មេញ</h3>
              <p className="text-[11px] text-slate-400">តារាងតម្លៃរាយ និងចន្លោះតម្លៃផ្លូវការរបស់គ្លីនិក</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden font-medium cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "គ្រប់ប្រភេទទាំងអស់" : c}
                </option>
              ))}
            </select>
            <button
              onClick={fetchPrices}
              className="p-1.5 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              title="ផ្ទុកឡើងវិញ"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs animate-pulse">
            កំពុងទាញយកតារាងតម្លៃ...
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/70 font-bold">
                  <th className="px-4 py-2 rounded-l-lg">សេវាកម្ម</th>
                  <th className="px-4 py-2">ប្រភេទ</th>
                  <th className="px-4 py-2">តម្លៃព្យាបាល</th>
                  <th className="px-4 py-2 text-right rounded-r-lg">ប័ណ្ណសារ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedPrices.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition">
                    <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium">
                        {p.category || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatPriceDisplay(p)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleArchiveService(p.id)}
                        title="ដាក់ក្នុងប័ណ្ណសារ (Archive)"
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedPrices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 italic">
                      គ្មានសេវាកម្មនៅក្នុងប្រភេទនេះឡើយ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Archived Services List */}
        {!isLoading && prices.some((p) => p.archived) && (
          <div className="mt-8 pt-4 border-t border-slate-100 animate-fade-in">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-slate-400" />
              សេវាកម្មក្នុងប័ណ្ណសារ (Archived Services)
            </h4>
            <div className="max-h-[180px] overflow-y-auto pr-1 bg-slate-50/30 rounded-2xl p-3 border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <th className="px-3 py-1.5">សេវាកម្ម</th>
                    <th className="px-3 py-1.5">តម្លៃ</th>
                    <th className="px-3 py-1.5 text-right">ទាញយកវិញ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-500">
                  {prices.filter((p) => p.archived).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-100/50 transition">
                      <td className="px-3 py-2 line-through text-slate-400">{p.name}</td>
                      <td className="px-3 py-2 font-mono text-slate-400">
                        {p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice !== p.maxPrice
                          ? `$${p.minPrice.toFixed(2)} – $${p.maxPrice.toFixed(2)}`
                          : `$${(p.minPrice ?? p.price).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleRestoreService(p.id)}
                          title="ទាញយកពីប័ណ្ណសារមកវិញ (Restore)"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded-lg transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
