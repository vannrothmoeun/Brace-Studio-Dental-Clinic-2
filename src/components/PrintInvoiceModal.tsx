/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Printer, X, CheckCircle, Download, FileText, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface PrintInvoiceModalProps {
  invoiceNo: string;
  billingDetails: any; // Contains items, totals, patient details
  onClose: () => void;
}

export default function PrintInvoiceModal({ invoiceNo, billingDetails, onClose }: PrintInvoiceModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!billingDetails) return null;

  // Download Invoice as Image (PNG) with crisp high-DPI scaling
  const handleDownloadInvoice = async () => {
    if (!printAreaRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2.5, // Crisp high-definition output
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safePatientName = (billingDetails.name || "Patient").replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, "_");
      link.download = `Invoice_${invoiceNo}_${safePatientName}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("មានបញ្ហាក្នុងការទាញយកវិក្កយបត្រ។ សូមសាកល្បងប្រើប៊ូតុងបោះពុម្ពជំនួសវិញ។");
    } finally {
      setIsDownloading(false);
    }
  };

  // Trigger browser-native printing
  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;

    if (printContent) {
      // Create a temporary print stylesheet context
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice ${invoiceNo} - Brace Studio Dental Clinic</title>
              <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
                body {
                  font-family: 'Kantumruy Pro', 'Inter', sans-serif;
                  background-color: white !important;
                  color: black !important;
                }
                @media print {
                  .no-print { display: none !important; }
                  body { padding: 15px; }
                }
              </style>
            </head>
            <body class="p-8">
              ${printContent}
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const todayStr = new Intl.DateTimeFormat("km-KH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const calculateSubtotal = () => {
    return billingDetails.items?.reduce((sum: number, item: any) => sum + (item.rate * item.qty), 0) || 0;
  };

  const subtotal = calculateSubtotal();
  const discountAmt = subtotal * ((billingDetails.discountPct || 0) / 100);
  const totalDue = Math.max(0, subtotal - discountAmt - (billingDetails.depositUsed || 0));

  const getPaymentMethodKhmer = (method: string) => {
    if (method === "Cash") return "លុយសុទ្ធ (Cash)";
    if (method === "ABA Bank / QR") return "ABA Bank / QR Code";
    if (method === "Card") return "កាតឥណទាន (Card)";
    return method || "លុយសុទ្ធ";
  };

  return (
    <div id="print-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div id="print-modal-container" className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col overflow-hidden max-h-[95vh] my-4">
        
        {/* Modal Controller Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-slate-800 text-sm">វិក្កយបត្រត្រូវបានបង្កើតជោគជ័យ!</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area Wrapper */}
        <div className="flex-1 overflow-y-auto p-8" ref={printAreaRef}>
          <div className="bg-white p-2">
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-200 pb-5 gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  🦷 Brace Studio Dental Clinic
                </h1>
                <p className="text-xs text-blue-700 font-bold tracking-wide mt-0.5">
                  BRACE STUDIO DENTAL CLINIC
                </p>
                <p className="text-[11px] text-slate-600 font-medium mt-1">
                  ផ្ទះ 071 ផ្លូវ 21 ភូមិថ្មី សង្កាត់តាខ្មៅ កណ្តាល
                </p>
                <p className="text-[11px] text-slate-600 font-bold font-mono mt-0.5">
                  Tel: 061 62 05 07 / 060 62 05 07
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold inline-block font-mono mb-1 border border-blue-100">
                  {invoiceNo}
                </div>
                <p className="text-[10px] text-slate-400">កាលបរិច្ឆេទ: {todayStr}</p>
                <p className="text-[10px] text-slate-500">គ្រូពេទ្យ: <span className="font-bold text-slate-700">{billingDetails.doctor || "Dr. Ly MengKheang"}</span></p>
              </div>
            </div>

            {/* Billing profiles info */}
            <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-100 text-xs">
              <div>
                <h4 className="text-slate-400 font-bold uppercase tracking-wider mb-1 text-[10px]">ព័ត៌មានអ្នកជំងឺ</h4>
                <p className="font-bold text-slate-800 text-sm">{billingDetails.name}</p>
                <p className="text-slate-500 font-mono mt-0.5">{billingDetails.phone}</p>
                <p className="text-[10px] text-slate-400 mt-1">លេខកូដ: {billingDetails.patientId}</p>
              </div>
              <div className="text-right">
                <h4 className="text-slate-400 font-bold uppercase tracking-wider mb-1 text-[10px]">ព័ត៌មានបង់ប្រាក់</h4>
                <p className="font-semibold text-slate-700">បង់ភ្លាមៗ</p>
                <p className="text-slate-500 font-medium mt-0.5">របៀបបង់ប្រាក់: {getPaymentMethodKhmer(billingDetails.paymentMethod)}</p>
              </div>
            </div>

            {/* Treatment Items lists */}
            <table className="w-full mt-6 text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2">សេវាកម្មព្យាបាល</th>
                  <th className="py-2 text-center">ចំនួន</th>
                  <th className="py-2 text-right">តម្លៃរាយ</th>
                  <th className="py-2 text-right">សរុប</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billingDetails.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="text-slate-700">
                    <td className="py-2.5">
                      <span className="font-bold block text-slate-800">{item.service}</span>
                      <span className="text-[10px] text-slate-400 italic">{item.desc || "សេវាកម្មព្យាបាលធ្មេញ"}</span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold text-slate-600">{item.qty}</td>
                    <td className="py-2.5 text-right font-mono text-slate-500">${Number(item.rate).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-800">
                      ${(item.qty * item.rate).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial ledger calculations */}
            <div className="border-t-2 border-slate-100 pt-4 mt-6 flex justify-end text-xs">
              <div className="w-full sm:w-72 space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>ប្រាក់សរុប/Total:</span>
                  <span className="font-mono font-bold text-slate-800">${subtotal.toFixed(2)}</span>
                </div>
                {billingDetails.discountPct > 0 && (
                  <div className="flex justify-between text-violet-600 font-medium">
                    <span>បញ្ចុះតម្លៃ ({billingDetails.discountPct}%):</span>
                    <span className="font-mono font-bold">-${discountAmt.toFixed(2)}</span>
                  </div>
                )}
                {billingDetails.depositUsed > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>ប្រាក់កក់/Deposit:</span>
                    <span className="font-mono font-bold">-${Number(billingDetails.depositUsed).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2 text-base">
                  <span>ប្រាក់នៅខ្វះ/Balance:</span>
                  <span className="font-mono text-blue-600">${totalDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Dental Signature section */}
            <div className="grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-dashed border-slate-100 text-center text-[10px] text-slate-400">
              <div>
                <p className="font-bold text-slate-600 mb-12">ហត្ថលេខាគ្រូពេទ្យ</p>
                <div className="w-32 h-px bg-slate-200 mx-auto" />
                <p className="mt-1 font-bold text-slate-500">{billingDetails.doctor || "Dr. Ly MengKheang"}</p>
              </div>
              <div>
                <p className="font-bold text-slate-600 mb-12">ហត្ថលេខាអ្នកជំងឺ</p>
                <div className="w-32 h-px bg-slate-200 mx-auto" />
                <p className="mt-1 font-bold text-slate-500">{billingDetails.name}</p>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 mt-10">
              សូមអរគុណដែលបានជ្រើសរើសសេវាកម្មព្យាបាលធ្មេញនៅ <strong>Brace Studio Dental Clinic</strong>!
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2.5 bg-slate-50/50">
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            បិទ
          </button>
          
          {/* Download Invoice Button */}
          <button
            onClick={handleDownloadInvoice}
            disabled={isDownloading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs hover:shadow-md transition duration-200 flex items-center gap-1.5 cursor-pointer"
            title="ទាញយកវិក្កយបត្រជារូបភាព (PNG)"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>កំពុងទាញយក...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>ទាញយកវិក្កយបត្រ</span>
              </>
            )}
          </button>

          {/* Print Invoice Button */}
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-xs hover:shadow-md transition duration-200 flex items-center gap-1.5 cursor-pointer"
            title="បោះពុម្ពវិក្កយបត្រ ឬរក្សាទុកជា PDF"
          >
            <Printer className="w-4 h-4" />
            <span>បោះពុម្ពវិក្កយបត្រ</span>
          </button>
        </div>

      </div>
    </div>
  );
}
