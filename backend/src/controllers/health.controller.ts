import { Request, Response } from "express";
import prisma from "../config/prisma.js";

export const getHealth = async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "OK",
      message: "Workly backend and database are connected 💜",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
    });
  }
};