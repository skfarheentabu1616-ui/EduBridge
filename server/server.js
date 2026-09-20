const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const issueRoutes = require("./routes/issueRoutes");
const feeRoutes = require("./routes/feeRoutes");
const marksRoutes = require("./routes/marks");
const parentRoutes = require("./routes/parentRoutes");
const pdfUploadRoutes = require("./routes/pdfUploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const observationRoutes = require("./routes/observationRoutes");
const timetableRoutes = require("./routes/timetableRoutes");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ================= ROUTES =================

app.use("/api/auth", authRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/leave", leaveRoutes);
app.use("/api/leaves", leaveRoutes);

app.use("/api/issues", issueRoutes);

app.use("/api/fees", feeRoutes);

app.use("/api/marks", marksRoutes);

app.use("/api/parent", parentRoutes);

app.use("/api/pdf", pdfUploadRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/mentor", mentorRoutes);

// Holiday
app.use(
  "/api/holidays",
  holidayRoutes
);

// Observation
app.use(
  "/api/observations",
  observationRoutes
);

// Timetable
app.use(
  "/api/timetable",
  timetableRoutes
);

// ================= HEALTH & ROOT =================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "EduBridge backend is running",
  });
});

app.get("/", (req, res) => {
  res.json({
    message:
      "EduBridge Backend is Running 🚀",
  });
});

// ================= DATABASE =================

connectDB();

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});