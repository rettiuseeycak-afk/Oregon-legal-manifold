import express from 'express';
import { uploadEvidenceToDrive } from '../services/googleWorkspace';

const router = express.Router();

router.post('/upload', async (req, res) => {
  try {
    const { userToken, fileName, mimeType, fileContentBase64, folderId } = req.body;
    const buffer = Buffer.from(fileContentBase64, 'base64');
    const result = await uploadEvidenceToDrive({
      userToken, fileName, mimeType, buffer, folderId
    });
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'WORKSPACE_UPLOAD_FAILED', details: err.message });
  }
});

export default router;
