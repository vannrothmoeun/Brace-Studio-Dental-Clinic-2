/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Archive, RotateCcw, DollarSign, Sparkles, Tag, Layers, RefreshCw, SlidersHorizontal, ArrowRight } from "lucide-react";
import { ServicePrice } from "../types";
import {
  getFirestoreCollection,
  saveToFirestore,
  deleteFromFirestore,
  COLLECTIONS,
} from "../services/firestoreService";

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
      const data = await getFirestoreCollection<ServicePrice>(COLLECTIONS.PRICES);
      setPrices(data);
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
      const id = `PR${Math.floor(100 + Math.random() * 900)}`;
      const newService: ServicePrice = {
        id,
        name: name.trim(),
        price: payloadMin,
        minPrice: payloadMin,
        maxPrice: payloadMax,
        category,
        archived: false,
      };

      await saveToFirestore(COLLECTIONS.PRICES, newService);

      setName("");
      setFixedPrice("");
      setMinPrice("");
      setMaxPrice("");
      setCategory("General");
      fetchPrices();
      if (onPricesUpdated) onPricesUpdated();
    } catch (error) {
      console.error("Add service error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveService = async (id: string) => {
    try {
      const target = prices.find((p) => p.id === id);
      if (target) {
        await saveToFirestore(COLLECTIONS.PRICES, {
          ...target,
          archived: true,
        });
        fetchPrices();
        if (onPricesUpdated) onPricesUpdated();
      }
    } catch (error) {
      console.error("Archive error:", error);
    }
  };

  const handleRestoreService = async (id: string) => {
    try {
      const target = prices.find((p) => p.id === id);
      if (target) {
        await saveToFirestore(COLLECTIONS.PRICES, {
          ...target,
          archived: false,
        });
        fetchPrices();
        if (onPricesUpdated) onPricesUpdated();
      }
    } catch (error) {
      console.error("Restore error:", error);
    }
  };

  const categories = ["All", ...Array.from(new Set(prices.map((p) => p.category)))];

  const filteredPrices = prices.filter((p) => {
    if (filterCategory === "All") return true;
    return p.category === filterCategory;
  });

  return (
    <div id="service-prices-container" className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              🏷️ តារាងថ្លៃសេវាកម្ម (Service Price Catalog)
            </h2>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Brace Studio
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            កំណត់តម្លៃស្តង់ដារ និងចន្លោះតម្លៃ (Price Range) សម្រាប់គ្លីនិកធ្មេញ Brace Studio
          </p>
        </div>
        <button
          onClick={fetchPrices}
          className="text-xs text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-medium self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          <span>ផ្ទុកឡើងវិញ</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Add New Service Form Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">បន្ថែមសេវាកម្មថ្មី</h3>
              <p className="text-[10px] text-slate-400">កំណត់ឈ្មោះ ប្រភេទ និងតម្លៃ</p>
            </div>
          </div>

          <form onSubmit={handleAddService} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                ឈ្មោះសេវាកម្ម (Service Name)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ឧ. ដកធ្មេញថ្គាមទាល់, ប៉ះធ្មេញ..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                ប្រភេទសេវា (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition font-medium"
              >
                <option value="General">General (ទូទៅ)</option>
                <option value="Preventive">Preventive (បង្ការ/សម្អាត)</option>
                <option value="Restorative">Restorative (ប៉ះ/ជួសជុល)</option>
                <option value="Surgical">Surgical (វះកាត់/ដក)</option>
                <option value="Endodontic">Endodontic (ព្យាបាលឫសធ្មេញ)</option>
                <option value="Prosthetic">Prosthetic (ដាក់ធ្មេញ/ស្រោប)</option>
                <option value="Orthodontic">Orthodontic (តម្រង់ធ្មេញ)</option>
                <option value="Cosmetic">Cosmetic (កែសម្ផស្សធ្មេញ)</option>
              </select>
            </div>

            {/* Price Type Switch */}
            <div>
              <label className="block font-bold text-slate-600 mb-1.5">
                ទម្រង់កំណត់តម្លៃ
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPriceType("fixed")}
                  className={`py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                    priceType === "fixed"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  តម្លៃថេរ (Fixed)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType("range")}
                  className={`py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                    priceType === "range"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ចន្លោះតម្លៃ (Range)
                </button>
              </div>
            </div>

            {priceType === "fixed" ? (
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  តម្លៃសេវា ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    ទាបបំផុត ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      required
                      className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    ខ្ពស់បំផុត ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "កំពុងបញ្ចូល..." : "រក្សាទុកសេវាកម្មថ្មី"}</span>
            </button>
          </form>
        </div>

        {/* 3. Catalog Listing Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                បញ្ជីសេវាកម្មទាំងអស់ ({filteredPrices.length})
              </h3>
              <p className="text-[10px] text-slate-400">តម្រៀបតាមប្រភេទ ឬតម្លៃ</p>
            </div>

            {/* Category Badges Filter */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    filterCategory === cat
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider text-left bg-slate-50/70 rounded-xl">
                  <th className="px-3 py-2.5 font-bold rounded-l-xl">កូដ</th>
                  <th className="px-3 py-2.5 font-bold">ឈ្មោះសេវាកម្ម</th>
                  <th className="px-3 py-2.5 font-bold">ប្រភេទ</th>
                  <th className="px-3 py-2.5 font-bold">តម្លៃសេវា ($)</th>
                  <th className="px-3 py-2.5 font-bold text-right rounded-r-xl">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrices.map((p) => {
                  const isRange = p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice !== p.maxPrice;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/50 transition ${
                        p.archived ? "opacity-40 bg-slate-50/30" : ""
                      }`}
                    >
                      <td className="px-3 py-3 font-mono font-bold text-slate-500">
                        {p.id}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-800">
                        {p.name}
                        {p.archived && (
                          <span className="ml-2 text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                            ផ្អាកប្រើ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">
                        {isRange ? (
                          <span className="text-blue-600 font-black">
                            ${p.minPrice} - ${p.maxPrice}
                          </span>
                        ) : (
                          <span>${p.price || p.minPrice}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {p.archived ? (
                          <button
                            onClick={() => handleRestoreService(p.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="បើកដំណើរការឡើងវិញ"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveService(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="ផ្អាកការប្រើប្រាស់"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
