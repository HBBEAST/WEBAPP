const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/dashboard — summary stats for current user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Projects user belongs to
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { tasks: true } } },
    });

    // Tasks assigned to user
    const myTasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const overdueTasks = myTasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== 'DONE'
    );

    const byStatus = {
      TODO: myTasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: myTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      REVIEW: myTasks.filter((t) => t.status === 'REVIEW').length,
      DONE: myTasks.filter((t) => t.status === 'DONE').length,
    };

    res.json({
      totalProjects: projects.length,
      totalTasks: myTasks.length,
      overdueTasks: overdueTasks.length,
      byStatus,
      recentTasks: myTasks.slice(0, 5),
      projects: projects.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
