import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";

const router = Router();

// ==================== PROJECT ROUTES ====================

// Create project
router.post("/", authenticate, createProject);

// Get all projects belonging to logged-in user
router.get("/", authenticate, getMyProjects);

// Get a single project
router.get("/:id", authenticate, getProjectById);

// Update project
router.put("/:id", authenticate, updateProject);

// Delete project
router.delete("/:id", authenticate, deleteProject);

export default router;