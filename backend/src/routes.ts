import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import pollsRoutes from './modules/polls/polls.routes';
import votesRoutes from './modules/votes/votes.routes';
import commentsRoutes from './modules/comments/comments.routes';
import favoritesRoutes from './modules/favorites/favorites.routes';
import searchRoutes from './modules/search/search.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import healthRoutes from './modules/health/health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/polls', pollsRoutes);
router.use('/votes', votesRoutes);
router.use('/comments', commentsRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/categories', categoriesRoutes);

export default router;
