import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";

const router = Router();

// ==================== TASK ROUTES ====================

// Create task
router.post("/", authenticate, createTask);

// Get tasks belonging to a project
router.get("/", authenticate, getTasksByProject);

// Get a single task
router.get("/:id", authenticate, getTaskById);

// Update task
router.put("/:id", authenticate, updateTask);

// Delete task
router.delete("/:id", authenticate, deleteTask);

export default router;