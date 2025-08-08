import { Router } from 'express';
import KickController from '../controllers/KickController.js';

const router = Router();

router.get('/streamers', KickController.getStreamers);
router.get('/live-streamers', KickController.getLiveStreamers);
router.get('/streamers/:streamerName', KickController.getStreamer);

export default router;
