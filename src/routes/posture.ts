import express from 'express';
import { updateProceduralPosture } from '../services/proceduralPosture';

const router = express.Router();

router.post('/update', async (req, res) => {
  try {
    const { caseId } = req.body;
    const posture = await updateProceduralPosture(caseId);
    res.json({ posture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'POSTURE_UPDATE_FAILED' });
  }
});

export default router;
