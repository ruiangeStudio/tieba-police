import express from 'express';
import { getHome, getHealth } from '../controllers/homeController.js';

const router = express.Router();

router.get('/', getHome);
router.get('/health', getHealth);

export default router; 