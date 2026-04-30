const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// GET /api/projects — list user's projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user.id } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — create (creator becomes ADMIN)
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Project name required'),
    body('description').optional().trim(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, description } = req.body;
      const project = await prisma.project.create({
        data: {
          name,
          description,
          createdById: req.user.id,
          members: {
            create: { userId: req.user.id, role: 'ADMIN' },
          },
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/projects/:projectId
router.get('/:projectId', requireProjectRole('MEMBER'), async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:projectId — ADMIN only
router.put('/:projectId', requireProjectRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: { name, description },
    });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId — ADMIN only
router.delete('/:projectId', requireProjectRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/members — ADMIN only: invite by email
router.post('/:projectId/members', requireProjectRole('ADMIN'), async (req, res, next) => {
  try {
    const { email, role = 'MEMBER' } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.projectId, userId: user.id } },
      create: { projectId: req.params.projectId, userId: user.id, role },
      update: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId/members/:userId — ADMIN only
router.delete('/:projectId/members/:userId', requireProjectRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: req.params.projectId,
          userId: req.params.userId,
        },
      },
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
