import "dotenv/config";
import cors from "cors";
import express from "express";
import sosRoutes from "./routes/sos.js";
import emergencyContactRoutes from "./routes/emergencyContacts.js";
import trainingRoutes from "./routes/training.js";
import admin, { db } from "./firebaseAdmin.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "lifeline-bd-backend" });
});

app.post("/dispatch", async (req, res) => {
  const { service, userId } = req.body ?? {};
  if (!service || !userId) {
    return res.status(400).json({
      ok: false,
      error: "service and userId are required.",
    });
  }

  try {
    const ref = await db.collection("fire_dispatches").add({
      service,
      userId,
      status: "dispatched",
      source: "app",
      incidentType: "Building Fire",
      severity: "Medium",
      peopleTrapped: "No",
      notes: "",
      contactNumber: "",
      requesterLocation: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      ok: true,
      dispatchId: ref.id,
      service,
      userId,
      status: "dispatched",
      message: `${service} dispatch created successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to store dispatch request.",
    });
  }
});

app.use(sosRoutes);
app.use(emergencyContactRoutes);
app.use("/api/training", trainingRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Lifeline backend running on :${port}`);
});
