const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/tasks?projectId=xxx — list tasks for a project
router.get('/', async (req, res, next) => {
  try {
    const { projectId, assigneeId, status } = req.query;
    if (!projectId) return res.status(400).json({ message: 'projectId required' });

    // Verify membership
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const where = { projectId };
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks — create task (member+)
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('projectId').notEmpty().withMessage('projectId required'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { title, description, projectId, assigneeId, priority, status, dueDate } = req.body;

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: req.user.id } },
      });
      if (!member) return res.status(403).json({ message: 'Access denied' });

      const task = await prisma.task.create({
        data: {
          title,
          description,
          projectId,
          assigneeId: assigneeId || null,
          priority: priority || 'MEDIUM',
          status: status || 'TODO',
          dueDate: dueDate ? new Date(dueDate) : null,
          createdById: req.user.id,
        },
        include: {
          assignee: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/tasks/:taskId — update task
router.put('/:taskId', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ message: 'Access denied' });

    // Members can only update status; admins can update everything
    const { title, description, status, priority, assigneeId, dueDate } = req.body;
    const updateData = { status };

    if (member.role === 'ADMIN') {
      Object.assign(updateData, { title, description, priority, assigneeId, dueDate: dueDate ? new Date(dueDate) : null });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:taskId — ADMIN or task creator
router.delete('/:taskId', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId: req.user.id } },
    });

    if (!member || (member.role !== 'ADMIN' && task.createdById !== req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
