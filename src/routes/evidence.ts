import express from 'express';
import { sha256 } from '../services/hash';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { logCoCEvent } from '../services/chainOfCustody';
import { EvidenceRecord } from '../types/case';

const router = express.Router();
const EVIDENCE_COLLECTION = 'evidence';

router.post('/upload', async (req, res) => {
  try {
    const { caseId, fileContentBase64, title, createdBy } = req.body;

    const buffer = Buffer.from(fileContentBase64, 'base64');
    const hash = sha256(buffer);

    const ref = doc(collection(db, EVIDENCE_COLLECTION));
    const evidence: EvidenceRecord = {
      id: ref.id,
      caseId,
      title,
      date: new Date().toISOString(),
      category: 'unclassified',
      summary: '',
      tags: [],
      hash,
      createdAt: new Date().toISOString(),
      createdBy,
    };

    await setDoc(ref, evidence);

    await logCoCEvent({
      evidenceId: evidence.id,
      caseId,
      type: 'UPLOAD',
      actor: 'USER',
      actorId: createdBy,
      timestamp: new Date().toISOString(),
      details: { hash, size: buffer.length },
    });

    res.json({ evidence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'UPLOAD_FAILED' });
  }
});

export default router;
