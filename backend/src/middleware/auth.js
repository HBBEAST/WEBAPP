const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Check project membership + role
const requireProjectRole = (requiredRole) => async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });

    if (!member) {
      return res.status(403).json({ message: 'Not a member of this project' });
    }

    if (requiredRole === 'ADMIN' && member.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.projectMember = member;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireProjectRole };
