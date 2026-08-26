/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Clock, Play, DollarSign, Ban, RefreshCw, UserCheck, Stethoscope } from "lucide-react";
import { QueueItem } from "../types";

interface ActiveQueueTableProps {
  queue: QueueItem[];
  onRefresh: () => void;
  onCheckout: (item: QueueItem) => void;
}

export default function ActiveQueueTable({ queue, onRefresh, onCheckout }: ActiveQueueTableProps) {
  // Filter active queue items (Waiting or In Treatment)
  const activeItems = queue.filter((item) => item.status === "Waiting" || item.status === "In Treatment");

  // Format wait elapsed time
  const getElapsedMinutes = (checkInTimeStr: string) => {
    try {
      const checkInTime = new Date(checkInTimeStr).getTime();
      const now = new Date().getTime();
      const diffMs = now - checkInTime;
      const mins = Math.floor(diffMs / 60000);
      return mins < 1 ? "ទើបតែចូល" : `មុននេះ ${mins} នាទី`;
    } catch (e) {
      return "N/A";
    }
  };

  // State hook to trigger tick render for elapsed wait timers
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  const handleUpdateStatus = async (visitId: string, status: "In Treatment" | "Cancelled") => {
    try {
      const response = await fetch(`/api/queue/${visitId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        onRefresh();
      } else {
        alert("មិនអាចធ្វើបច្ចុប្បន្នភាពស្ថានភាពជួរអ្នកជំងឺបានទេ។");
      }
    } catch (error) {
      console.error("Queue status update error:", error);
    }
  };

  return (
    <div id="active-queue-card" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            ជួរអ្នកជំងឺកំពុងរង់ចាំ
          </h2>
          <p className="text-xs text-slate-400">អ្នកជំងឺកំពុងរង់ចាំពិនិត្យ ឬកំពុងទទួលការព្យាបាល</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
          ធ្វើបច្ចុប្បន្នភាពជួរ
        </button>
      </div>

      {activeItems.length === 0 ? (
        <div id="empty-queue-alert" className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <Stethoscope className="w-8 h-8 text-slate-300 stroke-1" />
          <p className="italic">គ្មានអ្នកជំងឺកំពុងរង់ចាំ ឬទទួលការព្យាបាលនៅឡើយទេ។</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table id="active-queue-table" className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-[11px] text-slate-400 uppercase tracking-wider text-left bg-slate-50/70 rounded-xl">
                <th className="px-4 py-3 font-semibold rounded-l-xl">ម៉ោងចូល</th>
                <th className="px-4 py-3 font-semibold">អ្នកជំងឺ</th>
                <th className="px-4 py-3 font-semibold">គ្រូពេទ្យ</th>
                <th className="px-4 py-3 font-semibold">ស្ថានភាព</th>
                <th className="px-4 py-3 font-semibold text-right rounded-r-xl">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 divide-dashed">
              {activeItems.map((item) => {
                const isWaiting = item.status === "Waiting";
                const isInTreatment = item.status === "In Treatment";

                return (
                  <tr key={item.visitId} className="hover:bg-slate-50/50 transition duration-150">
                    {/* Timestamp & Wait Time */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-700">{item.timestamp}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {getElapsedMinutes(item.checkInTime)}
                      </div>
                    </td>

                    {/* Patient Name & Phone */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.phone}</div>
                    </td>

                    {/* Dentist */}
                    <td className="px-4 py-4 text-slate-600 font-medium">
                      {item.doctor}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {isWaiting ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          រង់ចាំ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-blue-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          កំពុងព្យាបាល
                        </span>
                      )}
                    </td>

                    {/* Actions panel */}
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        {isWaiting && (
                          <button
                            onClick={() => handleUpdateStatus(item.visitId, "In Treatment")}
                            className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-100 hover:border-blue-600 font-semibold px-3 py-1.5 rounded-xl text-xs transition duration-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            ព្យាបាល
                          </button>
                        )}

                        {isInTreatment && (
                          <button
                            onClick={() => onCheckout(item)}
                            className="bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 hover:border-emerald-600 font-semibold px-3 py-1.5 rounded-xl text-xs transition duration-200 flex items-center gap-1 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            ទូទាត់ប្រាក់
                          </button>
                        )}

                        {isWaiting && (
                          <button
                            onClick={() => handleUpdateStatus(item.visitId, "Cancelled")}
                            title="លុបចោលការរង់ចាំ"
                            className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100 hover:border-rose-600 p-2 rounded-xl transition duration-200 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
