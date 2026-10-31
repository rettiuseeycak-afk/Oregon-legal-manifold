import express from 'express';
import { buildIssueProfile } from '../services/issueSpotting';

const router = express.Router();

router.post('/build', async (req, res) => {
  try {
    const { caseId } = req.body;
    const profile = await buildIssueProfile(caseId);
    res.json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ISSUE_BUILD_FAILED' });
  }
});

export default router;
