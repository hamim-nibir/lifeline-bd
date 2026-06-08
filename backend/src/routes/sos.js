import { Router } from "express";
import { db } from "../firebaseAdmin.js";
import { notifyContactsBySMS } from "../services/contactNotifier.js";

const router = Router();
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 90 * 1000;

router.post("/api/sos/trigger", async (req, res) => {
  try {
    const { userId, userName, latitude, longitude, address } = req.body ?? {};
    if (!userId || !userName || latitude == null || longitude == null) {
      return res.status(400).json({ error: "userId, userName, latitude, longitude are required." });
    }

    const lastTriggerAt = rateLimitMap.get(userId);
    if (lastTriggerAt && Date.now() - lastTriggerAt < RATE_LIMIT_MS) {
      return res.status(429).json({ error: "Too many SOS triggers. Please wait a bit." });
    }
    rateLimitMap.set(userId, Date.now());

    const ref = await db.collection("sos_events").add({
      userId,
      userName,
      latitude,
      longitude,
      address: address ?? "",
      status: "active",
      triggeredAt: new Date().toISOString(),
      resolvedAt: null,
    });

    await db.collection("notifications").add({
      type: "sosAlert",
      title: "SOS Alert Triggered",
      body: `${userName} has triggered SOS and needs immediate support.`,
      reportedBy: userName,
      severity: "high",
      read: false,
      createdAt: new Date().toISOString(),
      sosEventId: ref.id,
      location: {
        latitude,
        longitude,
        mapsLink: `https://maps.google.com/?q=${latitude},${longitude}`,
      },
    });

    const contactsSnap = await db
      .collection("emergency_contacts")
      .where("userId", "==", userId)
      .where("notifyOnSOS", "==", true)
      .get();
    const phones = contactsSnap.docs.map((d) => d.data().phone).filter(Boolean);
    const msg = `${userName} has triggered an SOS alert. Their location: https://maps.google.com/?q=${latitude},${longitude}. Please respond immediately.`;
    await notifyContactsBySMS(phones, msg);

    res.status(201).json({ id: ref.id, status: "active" });
  } catch (error) {
    res.status(500).json({ error: "Failed to trigger SOS." });
  }
});

router.patch("/api/sos/:id/location", async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body ?? {};
    await db.collection("sos_events").doc(req.params.id).update({
      latitude,
      longitude,
      address: address ?? "",
      lastLocationAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update SOS location." });
  }
});

router.patch("/api/sos/:id/cancel", async (req, res) => {
  try {
    await db.collection("sos_events").doc(req.params.id).update({
      status: "cancelled",
      resolvedAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel SOS event." });
  }
});

router.get("/api/sos/history/:userId", async (req, res) => {
  try {
    const snap = await db
      .collection("sos_events")
      .where("userId", "==", req.params.userId)
      .orderBy("triggeredAt", "desc")
      .limit(30)
      .get();
    res.json({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch SOS history." });
  }
});

export default router;
