import express from 'express';
import { rebuildCaseBrain } from '../services/caseBrain';

const router = express.Router();

router.post('/rebuild', async (req, res) => {
  try {
    const { caseId } = req.body;
    const brain = await rebuildCaseBrain(caseId);
    res.json({ brain });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'BRAIN_REBUILD_FAILED' });
  }
});

export default router;
