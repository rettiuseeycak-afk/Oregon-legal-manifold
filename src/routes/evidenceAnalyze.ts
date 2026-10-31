import express from 'express';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { analyzeEvidenceText } from '../services/gemini';
import { logCoCEvent } from '../services/chainOfCustody';

const router = express.Router();
const EVIDENCE_COLLECTION = 'evidence';

router.post('/analyze', async (req, res) => {
  try {
    const { caseId, evidenceId, text, actorId } = req.body;

    const analysis = await analyzeEvidenceText({ caseId, evidenceId, text });

    const ref = doc(db, EVIDENCE_COLLECTION, evidenceId);
    await setDoc(
      ref,
      {
        title: analysis.title,
        date: analysis.date ?? new Date().toISOString(),
        category: analysis.category,
        summary: analysis.summary,
        tags: analysis.tags,
      },
      { merge: true }
    );

    await logCoCEvent({
      evidenceId,
      caseId,
      type: 'AI_ANALYSIS',
      actor: 'AI',
      timestamp: new Date().toISOString(),
      details: { analysis },
    });

    res.json({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ANALYSIS_FAILED' });
  }
});

export default router;
