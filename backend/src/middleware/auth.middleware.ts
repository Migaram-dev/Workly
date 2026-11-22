import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ==================== AUTHENTICATION MIDDLEWARE ====================

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Get the Authorization header
    const authHeader = req.headers.authorization;

    // 2. Check whether a token was provided
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    // 3. Extract the token
    const token = authHeader.split(" ")[1];

    // 4. Get JWT secret
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is missing.");
    }

    // 5. Verify the token
    const decoded = jwt.verify(token, secret);

    // 6. Check decoded token data
    if (typeof decoded === "string" || !decoded.userId) {
      return res.status(401).json({
        message: "Invalid token.",
      });
    }

    // 7. Attach user ID to the request
    (req as Request & { userId: string }).userId = decoded.userId;

    // 8. Allow request to continue
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};