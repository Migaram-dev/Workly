
import { Request, Response } from "express";
import prisma from "../config/prisma.js";

// ==================== CREATE TASK ====================

export const createTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId;

    const {
      title,
      description,
      projectId,
      status,
      priority,
      dueDate,
    } = req.body;

    // 1. Validate task title
    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required.",
      });
    }

    // 2. Validate project ID
    if (!projectId) {
      return res.status(400).json({
        message: "Project ID is required.",
      });
    }

    // 3. Check whether project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // 4. Validate task status
    const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status.",
      });
    }

    // 5. Validate task priority
    const validPriorities = ["LOW", "MEDIUM", "HIGH"];

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid task priority.",
      });
    }

    // 6. Validate due date
    let parsedDueDate: Date | null = null;

    if (dueDate) {
      parsedDueDate = new Date(dueDate);

      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          message: "Invalid due date.",
        });
      }
    }

    // 7. Create task in database
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        projectId,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: parsedDueDate,
      },
    });

    // 8. Return created task
    return res.status(201).json({
      message: "Task created successfully 🎉",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating the task.",
    });
  }
};

// ==================== GET ALL USER TASKS ====================

export const getTasksByProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId;

    // Get all tasks belonging to projects owned by the logged-in user
    const tasks = await prisma.task.findMany({
      where: {
        project: {
          ownerId: userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Tasks retrieved successfully.",
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      message: "Something went wrong while retrieving tasks.",
    });
  }
};

// ==================== GET SINGLE TASK ====================

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const taskId = req.params.id;

    // Find task belonging to user's project
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          ownerId: userId,
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json({
      message: "Task retrieved successfully.",
      task,
    });
  } catch (error) {
    console.error("Get single task error:", error);

    return res.status(500).json({
      message: "Something went wrong while retrieving the task.",
    });
  }
};

// ==================== UPDATE TASK ====================

export const updateTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const taskId = req.params.id;

    const {
      title,
      description,
      status,
      priority,
      dueDate,
    } = req.body;

    // Validate title if provided
    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({
        message: "Task title cannot be empty.",
      });
    }

    // Validate status
    const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status.",
      });
    }

    // Validate priority
    const validPriorities = ["LOW", "MEDIUM", "HIGH"];

    if (priority !== undefined && !validPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid task priority.",
      });
    }

    // Validate due date
    let parsedDueDate: Date | null | undefined;

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === "") {
        parsedDueDate = null;
      } else {
        parsedDueDate = new Date(dueDate);

        if (isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({
            message: "Invalid due date.",
          });
        }
      }
    }

    // Check task exists and belongs to user's project
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          ownerId: userId,
        },
      },
    });

    if (!existingTask) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        ...(title !== undefined && {
          title: title.trim(),
        }),

        ...(description !== undefined && {
          description: description?.trim() || null,
        }),

        ...(status !== undefined && {
          status,
        }),

        ...(priority !== undefined && {
          priority,
        }),

        ...(dueDate !== undefined && {
          dueDate: parsedDueDate,
        }),
      },
    });

    return res.status(200).json({
      message: "Task updated successfully ✨",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(500).json({
      message: "Something went wrong while updating the task.",
    });
  }
};

// ==================== DELETE TASK ====================

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const taskId = req.params.id;

    // Check whether task exists and belongs to user's project
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          ownerId: userId,
        },
      },
    });

    if (!existingTask) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    // Delete task
    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    return res.status(200).json({
      message: "Task deleted successfully 🗑️",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Something went wrong while deleting the task.",
    });
  }
};
