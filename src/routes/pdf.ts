import express from 'express';
import { generatePleadingPdf } from '../services/pdfPleading';

const router = express.Router();

router.get('/pleading/:caseId/:pleadingId', async (req, res) => {
  try {
    const { caseId, pleadingId } = req.params;
    await generatePleadingPdf({ caseId, pleadingId, res });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF_GENERATION_FAILED' });
  }
});

export default router;
