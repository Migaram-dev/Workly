import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import protectedRoutes from "./routes/protected.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";

const app = express();
const PORT = 5000;

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json());

// ==================== WELCOME ROUTE ====================

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Workly API 🚀",
    status: "Server is running!",
  });
});

// ==================== HEALTH ROUTES ====================

app.use("/api/health", healthRoutes);

// ==================== AUTHENTICATION ROUTES ====================

app.use("/api/auth", authRoutes);

// ==================== PROTECTED ROUTES ====================

app.use("/api/protected", protectedRoutes);

// ==================== PROJECT ROUTES ====================

app.use("/api/projects", projectRoutes);

// ==================== TASK ROUTES ====================

app.use("/api/tasks", taskRoutes);

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Workly server running at http://localhost:${PORT}`);
});