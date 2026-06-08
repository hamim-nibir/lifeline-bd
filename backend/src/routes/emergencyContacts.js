import { Router } from "express";
import { db } from "../firebaseAdmin.js";

const router = Router();

router.get("/api/users/:id/emergency-contacts", async (req, res) => {
  try {
    const userId = req.params.id;
    const snap = await db
      .collection("emergency_contacts")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ data: contacts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch emergency contacts." });
  }
});

router.post("/api/users/:id/emergency-contacts", async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, phone, relationship, notifyOnSOS = true } = req.body ?? {};
    if (!name || !phone || !relationship) {
      return res.status(400).json({ error: "name, phone, relationship are required." });
    }

    const ref = await db.collection("emergency_contacts").add({
      userId,
      name,
      phone,
      relationship,
      notifyOnSOS,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ id: ref.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to save emergency contact." });
  }
});

export default router;
