import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ChainOfCustodyEvent } from '../types/case';

const COC_COLLECTION = 'chainOfCustody';

export async function logCoCEvent(event: Omit<ChainOfCustodyEvent, 'id'>) {
  const cocCollection = collection(db, COC_COLLECTION);
  const ref = doc(cocCollection);
  const payload: ChainOfCustodyEvent = { id: ref.id, ...event };
  await setDoc(ref, payload);
  return payload;
}
