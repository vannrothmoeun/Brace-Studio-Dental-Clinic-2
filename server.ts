/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Locate db.json in the current working directory safely for both CJS/ESM
const DB_FILE = path.join(process.cwd(), "db.json");

// Helper interfaces
interface DBState {
  patients: any[];
  queue: any[];
  prices: any[];
  sales: any[];
  treatments: any[];
  appointments: any[];
}

// Ensure database file exists and load it
function loadDatabase(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (!parsed.appointments) {
        parsed.appointments = [
          {
            id: "AP102431",
            patientName: "Sopheap Meas",
            phone: "+855 12 345 678",
            service: "Root Canal Treatment",
            date: new Date().toISOString().split("T")[0],
            time: "10:00 AM",
            doctor: "Dr. Ly MengKheang",
            notes: "ពិនិត្យតាមដានធ្មេញថ្គាមខាងលើ (Follow-up visit 2)",
            createdAt: new Date().toISOString(),
            status: "Confirmed"
          },
          {
            id: "AP940212",
            patientName: "Sreyneang Chea",
            phone: "+855 98 765 432",
            service: "Scaling & Polishing",
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            time: "02:30 PM",
            doctor: "Dr. Ly MengKheang",
            notes: "កោសកំបោរធ្មេញ និងសម្អាតទូទៅ",
            createdAt: new Date().toISOString(),
            status: "Scheduled"
          }
        ];
      }
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read database, resetting to default:", error);
  }

  // Default initial database state with realistic and exciting dental records
  const defaultState: DBState = {
    patients: [
      {
        id: "PT102431",
        name: "Sopheap Meas",
        phone: "+855 12 345 678",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        visitsCount: 3,
      },
      {
        id: "PT940212",
        name: "Sreyneang Chea",
        phone: "+855 98 765 432",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        visitsCount: 1,
      },
      {
        id: "PT558190",
        name: "Chanravy Sok",
        phone: "+855 15 999 888",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        visitsCount: 2,
      },
      {
        id: "PT401295",
        name: "Vicheka Keo",
        phone: "+855 77 444 333",
        createdAt: new Date().toISOString(),
        visitsCount: 1,
      },
    ],
    queue: [
      {
        visitId: "VIS301294",
        patientId: "PT102431",
        name: "Sopheap Meas",
        phone: "+855 12 345 678",
        timestamp: "09:30 AM",
        checkInTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        status: "Waiting",
        doctor: "Dr. Ly MengKheang",
      },
      {
        visitId: "VIS883012",
        patientId: "PT940212",
        name: "Sreyneang Chea",
        phone: "+855 98 765 432",
        timestamp: "10:15 AM",
        checkInTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: "In Treatment",
        doctor: "Dr. Ly MengKheang",
      },
    ],
    prices: [
      { id: "PR001", name: "Scaling & Polishing", price: 20.00, minPrice: 20.00, maxPrice: 30.00, category: "Preventive" },
      { id: "PR002", name: "Composite Filling", price: 30.00, minPrice: 30.00, maxPrice: 50.00, category: "Restorative" },
      { id: "PR003", name: "Tooth Extraction (Simple)", price: 30.00, minPrice: 30.00, maxPrice: 60.00, category: "Surgical" },
      { id: "PR004", name: "Surgical Tooth Extraction", price: 80.00, minPrice: 80.00, maxPrice: 150.00, category: "Surgical" },
      { id: "PR005", name: "Porcelain Crown", price: 120.00, minPrice: 120.00, maxPrice: 180.00, category: "Prosthetic" },
      { id: "PR006", name: "Zirconia Crown", price: 220.00, minPrice: 220.00, maxPrice: 300.00, category: "Prosthetic" },
      { id: "PR007", name: "Root Canal Treatment", price: 80.00, minPrice: 80.00, maxPrice: 150.00, category: "Endodontic" },
      { id: "PR008", name: "Teeth Whitening (In-Office)", price: 150.00, minPrice: 150.00, maxPrice: 220.00, category: "Cosmetic" },
      { id: "PR009", name: "Dental Implant Consultation", price: 15.00, minPrice: 15.00, maxPrice: 15.00, category: "Consultation" },
      { id: "PR010", name: "Deep Cleaning (Periodontal)", price: 50.00, minPrice: 50.00, maxPrice: 80.00, category: "Preventive" },
    ],
    sales: [
      {
        txnId: "TXN401824",
        patientId: "PT102431",
        patientName: "Sopheap Meas",
        visitId: "VIS109204",
        amount: 60.00,
        type: "Payment",
        paymentMethod: "Cash",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        txnId: "TXN992813",
        patientId: "PT558190",
        patientName: "Chanravy Sok",
        visitId: "VIS402910",
        amount: 250.00,
        type: "Payment",
        paymentMethod: "ABA Bank / QR",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    treatments: [
      {
        id: "TL401821",
        patientId: "PT102431",
        patientName: "Sopheap Meas",
        phone: "+855 12 345 678",
        serviceName: "Root Canal Treatment",
        totalCost: 90.00,
        paidAmount: 30.00,
        remainingBalance: 60.00,
        totalVisits: 3,
        currentVisit: 1,
        lastVisitDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: "Active"
      },
      {
        id: "TL992815",
        patientId: "PT940212",
        patientName: "Sreyneang Chea",
        phone: "+855 98 765 432",
        serviceName: "Surgical Tooth Extraction",
        totalCost: 120.00,
        paidAmount: 40.00,
        remainingBalance: 80.00,
        totalVisits: 2,
        currentVisit: 1,
        lastVisitDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: "Active"
      },
      {
        id: "TL558195",
        patientId: "PT558190",
        patientName: "Chanravy Sok",
        phone: "+855 15 999 888",
        serviceName: "Zirconia Crown",
        totalCost: 250.00,
        paidAmount: 250.00,
        remainingBalance: 0.00,
        totalVisits: 2,
        currentVisit: 2,
        lastVisitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: "Completed"
      }
    ],
    appointments: [
      {
        id: "AP102431",
        patientName: "Sopheap Meas",
        phone: "+855 12 345 678",
        service: "Root Canal Treatment",
        date: new Date().toISOString().split("T")[0],
        time: "10:00 AM",
        doctor: "Dr. Ly MengKheang",
        notes: "ពិនិត្យតាមដានធ្មេញថ្គាមខាងលើ (Follow-up visit 2)",
        createdAt: new Date().toISOString(),
        status: "Scheduled"
      },
      {
        id: "AP940212",
        patientName: "Sreyneang Chea",
        phone: "+855 98 765 432",
        service: "Scaling & Polishing",
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        time: "02:30 PM",
        doctor: "Dr. Ly MengKheang",
        notes: "កោសកំបោរធ្មេញ និងសម្អាតទូទៅ",
        createdAt: new Date().toISOString(),
        status: "Scheduled"
      }
    ],
  };

  saveDatabase(defaultState);
  return defaultState;
}

function saveDatabase(state: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save database:", error);
  }
}

// Load DB into memory
let db = loadDatabase();
if (db.appointments) {
  db.appointments.forEach((a) => {
    if ((a as any).status === "Confirmed") {
      a.status = "Scheduled";
    }
  });
}
// Normalize service prices to include minPrice/maxPrice
if (db.prices) {
  db.prices.forEach((p) => {
    if (p.minPrice === undefined) {
      p.minPrice = p.price;
    }
    if (p.maxPrice === undefined) {
      p.maxPrice = p.price;
    }
  });
}
saveDatabase(db);
if (!db.treatments) {
  db.treatments = [
    {
      id: "TL401821",
      patientId: "PT102431",
      patientName: "Sopheap Meas",
      phone: "+855 12 345 678",
      serviceName: "Root Canal Treatment",
      totalCost: 90.00,
      paidAmount: 30.00,
      remainingBalance: 60.00,
      totalVisits: 3,
      currentVisit: 1,
      lastVisitDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: "Active"
    },
    {
      id: "TL992815",
      patientId: "PT940212",
      patientName: "Sreyneang Chea",
      phone: "+855 98 765 432",
      serviceName: "Surgical Tooth Extraction",
      totalCost: 120.00,
      paidAmount: 40.00,
      remainingBalance: 80.00,
      totalVisits: 2,
      currentVisit: 1,
      lastVisitDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: "Active"
    },
    {
      id: "TL558195",
      patientId: "PT558190",
      patientName: "Chanravy Sok",
      phone: "+855 15 999 888",
      serviceName: "Zirconia Crown",
      totalCost: 250.00,
      paidAmount: 250.00,
      remainingBalance: 0.00,
      totalVisits: 2,
      currentVisit: 2,
      lastVisitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: "Completed"
    }
  ];
  saveDatabase(db);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // --- API ROUTES FIRST ---

  // Patients endpoints
  app.get("/api/patients", (req, res) => {
    const query = req.query.query ? String(req.query.query).toLowerCase().trim() : "";
    if (!query) {
      return res.json(db.patients);
    }
    const matches = db.patients.filter(
      (p) => p.name.toLowerCase().includes(query) || p.phone.includes(query)
    );
    res.json(matches.slice(0, 8));
  });

  app.post("/api/patients", (req, res) => {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    // Prevent duplication by phone
    const existing = db.patients.find((p) => p.phone.trim() === phone.trim());
    if (existing) {
      return res.json(existing);
    }

    const newPatient = {
      id: "PT" + Math.floor(100000 + Math.random() * 900000),
      name: name.trim(),
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
      visitsCount: 0,
    };

    db.patients.push(newPatient);
    saveDatabase(db);
    res.status(201).json(newPatient);
  });

  // Active queue endpoints
  app.get("/api/queue", (req, res) => {
    res.json(db.queue);
  });

  // Check-in patient handler (used by both /api/queue/checkin and /api/checkin)
  const handleCheckInRequest = (req: express.Request, res: express.Response) => {
    const { name, phone, doctor, patientId } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    let finalPatientId = patientId;
    let isNew = !patientId;

    // Search if exists anyway
    let patientIndex = -1;
    if (patientId) {
      patientIndex = db.patients.findIndex((p) => p.id === patientId);
    } else {
      patientIndex = db.patients.findIndex((p) => p.phone.trim() === phone.trim());
      if (patientIndex !== -1) {
        finalPatientId = db.patients[patientIndex].id;
        isNew = false;
      }
    }

    if (isNew) {
      // Create new patient
      finalPatientId = "PT" + Math.floor(100000 + Math.random() * 900000);
      const newPatient = {
        id: finalPatientId,
        name: name.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
        visitsCount: 1,
      };
      db.patients.push(newPatient);
    } else {
      // Increment visit count
      if (patientIndex !== -1) {
        db.patients[patientIndex].visitsCount = (db.patients[patientIndex].visitsCount || 0) + 1;
      }
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const timeStr = formatter.format(new Date());

    const visitId = "VIS" + Math.floor(100000 + Math.random() * 900000);
    const newQueueItem = {
      visitId,
      patientId: finalPatientId,
      name: name.trim(),
      phone: phone.trim(),
      timestamp: timeStr,
      checkInTime: new Date().toISOString(),
      status: "Waiting" as const,
      doctor: doctor || "Dr. Ly MengKheang",
    };

    db.queue.push(newQueueItem);
    saveDatabase(db);

    res.status(201).json({ success: true, patientId: finalPatientId, visitId });
  };

  app.post("/api/queue/checkin", handleCheckInRequest);
  app.post("/api/checkin", handleCheckInRequest);

  // Update queue status
  app.patch("/api/queue/:visitId/status", (req, res) => {
    const { visitId } = req.params;
    const { status } = req.body;

    const index = db.queue.findIndex((q) => q.visitId === visitId);
    if (index === -1) {
      return res.status(404).json({ error: "Visit not found" });
    }

    db.queue[index].status = status;
    saveDatabase(db);
    res.json({ success: true, item: db.queue[index] });
  });

  // Appointments API endpoints
  app.get("/api/appointments", (req, res) => {
    db.appointments = db.appointments || [];
    res.json(db.appointments);
  });

  app.post("/api/appointments", (req, res) => {
    const { patientName, phone, service, date, time, notes, doctor } = req.body;
    if (!patientName || !date || !time) {
      return res.status(400).json({ error: "Patient name, date, and time are required" });
    }

    db.appointments = db.appointments || [];
    const newAppointment = {
      id: "AP" + Math.floor(100000 + Math.random() * 900000),
      patientName: patientName.trim(),
      phone: (phone || "").trim(),
      service: service || "General Dental Consultation",
      date,
      time,
      doctor: doctor || "Dr. Ly MengKheang",
      notes: notes || "",
      createdAt: new Date().toISOString(),
      status: "Scheduled",
    };

    db.appointments.unshift(newAppointment);
    saveDatabase(db);
    res.status(201).json(newAppointment);
  });

  app.patch("/api/appointments/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.appointments = db.appointments || [];
    const index = db.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    db.appointments[index].status = status;
    saveDatabase(db);
    res.json(db.appointments[index]);
  });

  app.delete("/api/appointments/:id", (req, res) => {
    const { id } = req.params;
    db.appointments = db.appointments || [];
    const index = db.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    db.appointments.splice(index, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Price List endpoints
  app.get("/api/prices", (req, res) => {
    res.json(db.prices);
  });

  app.post("/api/prices", (req, res) => {
    const { name, price, minPrice, maxPrice, category } = req.body;
    if (!name || (price === undefined && minPrice === undefined)) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const baseMin = minPrice !== undefined && minPrice !== "" ? Number(minPrice) : Number(price);
    const baseMax = maxPrice !== undefined && maxPrice !== "" ? Number(maxPrice) : baseMin;
    const basePrice = baseMin;

    const newService = {
      id: "PR" + Math.floor(1000 + Math.random() * 9000),
      name: name.trim(),
      price: basePrice,
      minPrice: baseMin,
      maxPrice: baseMax,
      category: category || "General",
    };

    db.prices.push(newService);
    saveDatabase(db);
    res.status(201).json(newService);
  });

  app.delete("/api/prices/:id", (req, res) => {
    const { id } = req.params;
    const index = db.prices.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Instead of deleting, archive it so it doesn't affect past history/data
    db.prices[index].archived = true;
    saveDatabase(db);
    res.json({ success: true });
  });

  // Restore/Unarchive service endpoint
  app.post("/api/prices/:id/restore", (req, res) => {
    const { id } = req.params;
    const index = db.prices.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Service not found" });
    }

    db.prices[index].archived = false;
    saveDatabase(db);
    res.json({ success: true });
  });

  // Treatment Lifecycle endpoints
  app.get("/api/treatments", (req, res) => {
    res.json(db.treatments);
  });

  app.post("/api/treatments", (req, res) => {
    const { patientId, patientName, phone, serviceName, totalCost, totalVisits, currentVisit, paidAmount } = req.body;
    if (!patientId || !patientName || !serviceName || totalCost === undefined || totalVisits === undefined || currentVisit === undefined) {
      return res.status(400).json({ error: "Missing required treatment lifecycle fields" });
    }

    const newTreatment = {
      id: "TL" + Math.floor(100000 + Math.random() * 900000),
      patientId,
      patientName,
      phone: phone || "",
      serviceName,
      totalCost: Number(totalCost),
      paidAmount: Number(paidAmount || 0),
      remainingBalance: Math.max(0, Number(totalCost) - Number(paidAmount || 0)),
      totalVisits: Number(totalVisits),
      currentVisit: Number(currentVisit),
      lastVisitDate: new Date().toISOString(),
      status: Number(currentVisit) >= Number(totalVisits) ? "Completed" : "Active"
    };

    db.treatments.push(newTreatment);
    saveDatabase(db);
    res.status(201).json(newTreatment);
  });

  app.put("/api/treatments/:id", (req, res) => {
    const { id } = req.params;
    const { currentVisit, paidAmount, status, totalVisits, totalCost } = req.body;

    const t = db.treatments.find((x) => x.id === id);
    if (!t) {
      return res.status(404).json({ error: "Treatment lifecycle not found" });
    }

    if (currentVisit !== undefined) t.currentVisit = Number(currentVisit);
    if (totalVisits !== undefined) t.totalVisits = Number(totalVisits);
    if (totalCost !== undefined) {
      t.totalCost = Number(totalCost);
      t.remainingBalance = Math.max(0, t.totalCost - (t.paidAmount || 0));
    }
    if (paidAmount !== undefined) {
      t.paidAmount = Number(paidAmount);
      t.remainingBalance = Math.max(0, (t.totalCost || 0) - t.paidAmount);
    }
    if (status !== undefined) {
      t.status = status;
    } else {
      t.status = (t.currentVisit >= t.totalVisits) ? "Completed" : "Active";
    }
    t.lastVisitDate = new Date().toISOString();

    saveDatabase(db);
    res.json(t);
  });

  app.delete("/api/treatments/:id", (req, res) => {
    const { id } = req.params;
    const index = db.treatments.findIndex((t) => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Treatment not found" });
    }
    db.treatments.splice(index, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Billing and sales endpoint
  app.post("/api/billing/invoice", (req, res) => {
    const {
      visitId,
      patientId,
      name,
      phone,
      doctor,
      discountPct,
      depositUsed,
      paymentMethod,
      items,
      treatmentUpdates,
    } = req.body;

    if (!visitId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Visit ID and treatment items are required" });
    }

    // Calculate totals
    let subtotal = 0;
    items.forEach((item: any) => {
      subtotal += Number(item.rate) * Number(item.qty);
    });

    const discountAmount = subtotal * (Number(discountPct || 0) / 100);
    const netAmount = subtotal - discountAmount - Number(depositUsed || 0);
    const finalAmount = Math.max(0, netAmount);

    const invoiceNo = "INV-" + Math.floor(100000 + Math.random() * 900000);

    // Add sales txn
    const newTxn = {
      txnId: "TXN" + Math.floor(100000 + Math.random() * 900000),
      patientId,
      patientName: name,
      visitId,
      amount: finalAmount,
      type: "Payment",
      paymentMethod: paymentMethod || "Cash",
      date: new Date().toISOString(),
    };

    db.sales.push(newTxn);

    // Update queue item
    const queueIndex = db.queue.findIndex((q) => q.visitId === visitId);
    if (queueIndex !== -1) {
      db.queue[queueIndex].status = "Completed";
      db.queue[queueIndex].treatmentItems = items;
      db.queue[queueIndex].invoiceNo = invoiceNo;
    }

    // Process treatment updates
    if (treatmentUpdates && Array.isArray(treatmentUpdates)) {
      treatmentUpdates.forEach((upd: any) => {
        if (upd.isNew) {
          const newTreatment = {
            id: "TL" + Math.floor(100000 + Math.random() * 900000),
            patientId,
            patientName: name,
            phone: phone || "",
            serviceName: upd.serviceName,
            totalCost: Number(upd.totalCost),
            paidAmount: Number(upd.paidAmount || 0),
            remainingBalance: Math.max(0, Number(upd.totalCost) - Number(upd.paidAmount || 0)),
            totalVisits: Number(upd.totalVisits),
            currentVisit: Number(upd.currentVisit),
            lastVisitDate: new Date().toISOString(),
            status: Number(upd.currentVisit) >= Number(upd.totalVisits) ? "Completed" : "Active"
          };
          db.treatments.push(newTreatment);
        } else if (upd.treatmentId) {
          const t = db.treatments.find((x) => x.id === upd.treatmentId);
          if (t) {
            t.currentVisit = Number(upd.currentVisit);
            t.paidAmount = Number(t.paidAmount || 0) + Number(upd.paidAmount || 0);
            t.remainingBalance = Math.max(0, Number(t.totalCost || 0) - Number(t.paidAmount || 0));
            t.lastVisitDate = new Date().toISOString();
            t.status = t.currentVisit >= t.totalVisits ? "Completed" : "Active";
          }
        }
      });
    }

    saveDatabase(db);

    res.json({
      success: true,
      invoiceNo,
      subtotal,
      discountAmount,
      finalAmount,
      txnId: newTxn.txnId,
    });
  });

  // Sales Ledger and KPIs endpoint
  app.get("/api/sales", (req, res) => {
    const totalSales = db.sales.reduce((sum, s) => sum + s.amount, 0);
    const completedVisits = db.queue.filter((q) => q.status === "Completed").length;

    res.json({
      ledger: db.sales,
      metrics: {
        totalRevenue: totalSales,
        completedVisits,
        activeQueueCount: db.queue.filter((q) => q.status === "Waiting" || q.status === "In Treatment").length,
        totalPatients: db.patients.length,
      },
    });
  });

  // Handle serving built assets in production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Integrate Vite middleware in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Start Server on PORT 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MengKheang Dental OS is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start MengKheang Dental OS server:", err);
});
