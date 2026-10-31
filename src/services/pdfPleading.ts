import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function generatePleadingPdf(params: {
  caseId: string;
  pleadingId: string;
  res: Response;
}) {
  const pleadingRef = doc(db, 'pleadings', params.pleadingId);
  const pleadingSnap = await getDoc(pleadingRef);

  const pleading = pleadingSnap.exists() ? pleadingSnap.data() : {};

  const docPdf = new PDFDocument({
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
  });

  params.res.setHeader('Content-Type', 'application/pdf');
  params.res.setHeader(
    'Content-Disposition',
    `attachment; filename="${pleading.title || 'pleading'}.pdf"`
  );

  docPdf.pipe(params.res);

  // line numbers in left margin
  for (let i = 1; i <= 50; i++) {
    docPdf.fontSize(8).text(i.toString(), 40, 72 + (i - 1) * 12);
  }

  // caption / header
  docPdf
    .fontSize(12)
    .text(pleading.caption || 'IN THE CIRCUIT COURT OF THE STATE OF OREGON', 100, 72, {
      width: 400,
      align: 'center',
    });

  docPdf.moveDown(3);

  // body
  docPdf.fontSize(12).text(pleading.body || '', {
    width: 400,
    align: 'left',
  });

  // signature block
  docPdf.moveDown(3);
  docPdf.text(pleading.signatureBlock || 'Respectfully submitted,', {
    width: 400,
  });

  docPdf.end();
}
