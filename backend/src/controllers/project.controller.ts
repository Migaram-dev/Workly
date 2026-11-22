import { Request, Response } from "express";
import prisma from "../config/prisma.js";

// ==================== CREATE PROJECT ====================

export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId;

    const { name, description, color } = req.body;

    // 1. Validate project name
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Project name is required.",
      });
    }

    // 2. Create project in database
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#8B5CF6",
        ownerId: userId,
      },
    });

    // 3. Return created project
    return res.status(201).json({
      message: "Project created successfully 🎉",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating the project.",
    });
  }
};

// ==================== GET MY PROJECTS ====================

export const getMyProjects = async (req: Request, res: Response) => {
  try {
    // 1. Get logged-in user's ID
    const userId = (req as Request & { userId: string }).userId;

    // 2. Find projects belonging to this user
    const projects = await prisma.project.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 3. Return projects
    return res.status(200).json({
      message: "Projects retrieved successfully.",
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      message: "Something went wrong while retrieving projects.",
    });
  }
};

// ==================== GET SINGLE PROJECT ====================

export const getProjectById = async (req: Request, res: Response) => {
  try {
    // 1. Get logged-in user's ID
    const userId = (req as Request & { userId: string }).userId;

    // 2. Get project ID from URL
    const projectId = req.params.id;

    // 3. Find project belonging to this user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    // 4. Check whether project exists
    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // 5. Return project
    return res.status(200).json({
      message: "Project retrieved successfully.",
      project,
    });
  } catch (error) {
    console.error("Get project error:", error);

    return res.status(500).json({
      message: "Something went wrong while retrieving the project.",
    });
  }
};

// ==================== UPDATE PROJECT ====================

export const updateProject = async (req: Request, res: Response) => {
  try {
    // 1. Get logged-in user's ID
    const userId = (req as Request & { userId: string }).userId;

    // 2. Get project ID from URL
    const projectId = req.params.id;

    // 3. Get update information
    const { name, description, color } = req.body;

    // 4. Validate project name if provided
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({
        message: "Project name cannot be empty.",
      });
    }

    // 5. Check whether project belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // 6. Update project
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(color !== undefined && { color }),
      },
    });

    // 7. Return updated project
    return res.status(200).json({
      message: "Project updated successfully ✨",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);

    return res.status(500).json({
      message: "Something went wrong while updating the project.",
    });
  }
};

// ==================== DELETE PROJECT ====================

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const projectId = req.params.id;

    // 1. Check if project exists and belongs to the user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // 2. Delete project and its tasks
    await prisma.$transaction([
      prisma.task.deleteMany({
        where: {
          projectId: projectId,
        },
      }),

      prisma.project.delete({
        where: {
          id: projectId,
        },
      }),
    ]);

    // 3. Return success response
    return res.status(200).json({
      message: "Project deleted successfully 🗑️",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      message: "Something went wrong while deleting the project.",
    });
  }
};