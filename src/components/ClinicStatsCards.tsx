/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Users, Clock, DollarSign, TrendingUp, Sparkles, Activity } from "lucide-react";
import { ClinicStats } from "../types";

interface ClinicStatsCardsProps {
  stats: ClinicStats;
}

export default function ClinicStatsCards({ stats }: ClinicStatsCardsProps) {
  const cardData = [
    {
      id: "stats-total-patients",
      title: "សរុបអ្នកជំងឺ",
      value: stats.totalPatients,
      sub: "អ្នកជំងឺបានចុះឈ្មោះ",
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50 text-blue-600",
    },
    {
      id: "stats-today-visits",
      title: "ចំនួនមកពិនិត្យថ្ងៃនេះ",
      value: stats.todayVisits,
      sub: "បានបញ្ចប់ការសម្រាកព្យាបាល",
      icon: Clock,
      color: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50 text-emerald-600",
    },
    {
      id: "stats-today-sales",
      title: "ចំណូលសរុបថ្ងៃនេះ",
      value: `$${stats.todaySales.toFixed(2)}`,
      sub: "ទូទាត់រួចរាល់",
      icon: DollarSign,
      color: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div id="clinic-stats-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cardData.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group overflow-hidden relative"
          >
            {/* Ambient background decoration */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-125 transition-transform duration-500 opacity-60 pointer-events-none" />

            <div className="relative z-10 space-y-1">
              <span className="text-xs font-semibold text-slate-400 block tracking-tight">
                {card.title}
              </span>
              <h3 className="text-2xl font-bold text-slate-850 tracking-tight">
                {card.value}
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {card.sub}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl ${card.bgLight} relative z-10 transition-transform duration-300 group-hover:scale-110`}>
              <IconComponent className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
