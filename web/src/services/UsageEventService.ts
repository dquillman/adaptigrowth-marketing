import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type UsageEventType = 'session' | 'coreAction' | 'completion';

export const UsageEventService = {
  emit: (userId: string, eventType: UsageEventType) => {
    // Fire-and-forget — no await, no retry
    addDoc(collection(db, 'usage_events'), {
      userId,
      eventType,
      timestamp: serverTimestamp(),
    }).catch(() => {}); // Fail silently
  },
};
