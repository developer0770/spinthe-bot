import { Router } from 'express';
import { getPopular, searchTracks } from './music.controller';

const router = Router();

router.get('/popular', getPopular);
router.get('/search', searchTracks);

export default router;
