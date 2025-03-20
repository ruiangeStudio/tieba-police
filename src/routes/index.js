import express from 'express';
import homeRoutes from './homeRoutes.js';

const router = express.Router();

// 注册所有路由
router.use('/', homeRoutes);

// 可以添加更多路由，例如：
// router.use('/api', apiRoutes);
// router.use('/auth', authRoutes);

export default router; 