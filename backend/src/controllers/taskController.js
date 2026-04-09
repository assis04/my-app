import { TaskService } from "../services/taskService.js";

export class TaskController {
  static async getTasks(req, res, next) {
    try {
      const user = req.user;
      const { page, limit } = req.query;
      const tasks = await TaskService.getTasksForUser(user, { page, limit });
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  }

  static async createTask(req, res, next) {
    try {
      const task = await TaskService.createTask(req.body, req.user);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  static async updateTaskStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const task = await TaskService.updateTaskStatus(id, status, req.user.id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await TaskService.updateTask(id, req.body, req.user.id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      await TaskService.deleteTask(id, req.user.id, req.user.role);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
