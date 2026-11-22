import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Protected route
router.get("/profile", authenticate, (req, res) => {
  const userId = (req as Request & { userId: string }).userId;

  res.status(200).json({
    message: "You have successfully accessed a protected route 🔐",
    userId,
  });
});

export default router;