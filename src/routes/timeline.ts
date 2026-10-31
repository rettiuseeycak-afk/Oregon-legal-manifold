import express from 'express';
import { rebuildTimeline } from '../services/timeline';

const router = express.Router();

router.post('/rebuild', async (req, res) => {
  try {
    const { caseId } = req.body;
    const events = await rebuildTimeline(caseId);
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TIMELINE_REBUILD_FAILED' });
  }
});

export default router;
