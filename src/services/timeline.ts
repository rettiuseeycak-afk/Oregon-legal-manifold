import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { EvidenceRecord } from '../types/case';

const TIMELINE_COLLECTION = 'caseTimeline';

export interface TimelineEvent {
  id: string;
  caseId: string;
  date: string;
  label: string;
  type: 'EVIDENCE' | 'PLEADING' | 'COURT_EVENT';
  refId: string;
  summary: string;
  createdAt: string;
}

export async function rebuildTimeline(caseId: string) {
  const evidenceQuery = query(collection(db, 'evidence'), where('caseId', '==', caseId));
  const evidenceSnap = await getDocs(evidenceQuery);

  const events: Omit<TimelineEvent, 'id'>[] = evidenceSnap.docs.map((d) => {
    const e = d.data() as EvidenceRecord;
    return {
      caseId,
      date: e.date,
      label: e.title,
      type: 'EVIDENCE',
      refId: e.id,
      summary: e.summary,
      createdAt: new Date().toISOString(),
    };
  });

  // TODO: add pleadings, court events similarly

  const batch = writeBatch(db);
  const existingQuery = query(collection(db, TIMELINE_COLLECTION), where('caseId', '==', caseId));
  const existing = await getDocs(existingQuery);
  existing.docs.forEach((d) => batch.delete(d.ref));

  events.forEach((ev) => {
    const ref = doc(collection(db, TIMELINE_COLLECTION));
    batch.set(ref, { id: ref.id, ...ev });
  });

  await batch.commit();
  return events;
}
