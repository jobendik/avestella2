/**
 * Firebase database operations for multiplayer
 * Ported from legacy_3/src/firebase/database.ts
 * 
 * NOTE: Requires 'firebase' package to be installed:
 * npm install firebase
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  CollectionReference,
  DocumentReference,
  Unsubscribe,
  Timestamp,
  QuerySnapshot,
  DocumentData,
  DocumentChange
} from 'firebase/firestore';
import { getFirebaseDb, getAppId } from './config';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Player {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
  radius: number;
  tetherHost: string | null;
  lastSeen: Timestamp | null;
  currentMessage?: string;
  messageTime?: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  uid: string;
  name: string;
  createdAt: Timestamp;
}

export interface Echo {
  id: string;
  x: number;
  y: number;
  text: string;
  uid: string;
  name: string;
  createdAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const getBasePath = (): string[] => {
  return ['artifacts', getAppId(), 'public', 'data'];
};

const getCollectionRef = (collectionName: string): CollectionReference => {
  const db = getFirebaseDb();
  const path = [...getBasePath(), collectionName] as unknown as [string, ...string[]];
  return collection(db, ...path);
};

const getDocRef = (collectionName: string, docId: string): DocumentReference => {
  const db = getFirebaseDb();
  const path = [...getBasePath(), collectionName, docId] as unknown as [string, ...string[]];
  return doc(db, ...path);
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER PRESENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update player presence in a shard
 */
export const updatePlayerPresence = async (
  shard: string,
  userId: string,
  data: Omit<Player, 'id'>
): Promise<void> => {
  const collectionName = `avestella_players_${shard}`;
  const docRef = getDocRef(collectionName, userId);

  await setDoc(docRef, {
    ...data,
    lastSeen: serverTimestamp()
  }, { merge: true });
};

/**
 * Delete player presence from a shard
 */
export const deletePlayerPresence = async (
  shard: string,
  userId: string
): Promise<void> => {
  const collectionName = `avestella_players_${shard}`;
  const docRef = getDocRef(collectionName, userId);

  await deleteDoc(docRef).catch(() => { });
};

/**
 * Subscribe to player updates in a shard
 */
export const subscribeToPlayers = (
  shard: string,
  callback: (players: Record<string, Player>) => void
): Unsubscribe => {
  const collectionName = `avestella_players_${shard}`;
  const colRef = getCollectionRef(collectionName);

  return onSnapshot(
    colRef,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const players: Record<string, Player> = {};
      const now = Date.now();

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const lastSeen = data.lastSeen?.toMillis() || 0;

        // Only include players seen in last minute
        if (now - lastSeen < 60000) {
          players[docSnap.id] = {
            id: docSnap.id,
            x: data.x,
            y: data.y,
            vx: 0,
            vy: 0,
            name: data.name,
            radius: data.radius,
            tetherHost: data.tetherHost || null,
            lastSeen: data.lastSeen,
            currentMessage: data.currentMessage,
            messageTime: data.messageTime
          };
        }
      });

      callback(players);
    },
    (error: Error) => {
      console.error('Players subscription error:', error);
    }
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send a chat message
 */
export const sendChatMessage = async (
  shard: string,
  message: {
    text: string;
    uid: string;
    name: string;
  }
): Promise<void> => {
  const collectionName = `avestella_chat_${shard}`;
  const colRef = getCollectionRef(collectionName);

  await addDoc(colRef, {
    ...message,
    createdAt: serverTimestamp()
  });
};

/**
 * Subscribe to chat messages in a shard
 */
export const subscribeToChat = (
  shard: string,
  callback: (messages: ChatMessage[], playerMessageUpdates: Array<{ id: string; message: string }>) => void
): Unsubscribe => {
  const collectionName = `avestella_chat_${shard}`;
  const colRef = getCollectionRef(collectionName);

  return onSnapshot(
    colRef,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const messages: ChatMessage[] = [];
      const playerMessageUpdates: Array<{ id: string; message: string }> = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        messages.push({
          id: docSnap.id,
          text: data.text,
          uid: data.uid,
          name: data.name,
          createdAt: data.createdAt
        });
      });

      // Sort by timestamp descending (client-side to avoid index requirement)
      messages.sort((a, b) => {
        const tA = a.createdAt?.toMillis() || 0;
        const tB = b.createdAt?.toMillis() || 0;
        return tB - tA;
      });

      // Take top 20 and reverse for display
      const topMessages = messages.slice(0, 20).reverse();

      // Track new messages for bubble display
      snapshot.docChanges().forEach((change: DocumentChange<DocumentData>) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          playerMessageUpdates.push({
            id: data.uid,
            message: data.text
          });
        }
      });

      callback(topMessages, playerMessageUpdates);
    },
    (error: Error) => {
      console.error('Chat subscription error:', error);
    }
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ECHOES (PERSISTENT MESSAGES)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Place an echo in the world
 */
export const placeEcho = async (echo: {
  x: number;
  y: number;
  text: string;
  uid: string;
  name: string;
}): Promise<void> => {
  const colRef = getCollectionRef('avestella_echoes');

  await addDoc(colRef, {
    ...echo,
    createdAt: serverTimestamp()
  });
};

/**
 * Subscribe to echoes in the world
 */
export const subscribeToEchoes = (
  callback: (echoes: Echo[]) => void
): Unsubscribe => {
  const colRef = getCollectionRef('avestella_echoes');

  return onSnapshot(
    colRef,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const echoes: Echo[] = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        echoes.push({
          id: docSnap.id,
          x: data.x,
          y: data.y,
          text: data.text,
          uid: data.uid,
          name: data.name,
          createdAt: data.createdAt
        });
      });

      callback(echoes);
    },
    (error: Error) => {
      console.error('Echoes subscription error:', error);
    }
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

export const cleanupPlayerPresence = async (
  userId: string,
  shards: string[]
): Promise<void> => {
  const promises = shards.map(shard =>
    deletePlayerPresence(shard, userId)
  );

  await Promise.allSettled(promises);
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEBRTC SIGNALING
// ═══════════════════════════════════════════════════════════════════════════════

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  targetId: string;
  senderId: string;
  data: any;
  timestamp: number;
}

export const sendSignal = async (signal: SignalData): Promise<void> => {
  const colRef = getCollectionRef(`avestella_signals_${signal.targetId}`);
  await addDoc(colRef, {
    ...signal,
    createdAt: serverTimestamp()
  });
};

export const subscribeToSignals = (
  userId: string,
  callback: (signals: SignalData[]) => void
): Unsubscribe => {
  return onSnapshot(
    getCollectionRef(`avestella_signals_${userId}`),
    (snapshot) => {
      const signals: SignalData[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          signals.push({
            type: data.type,
            targetId: data.targetId,
            senderId: data.senderId,
            data: data.data,
            timestamp: data.timestamp || Date.now()
          });
          // Consume signal
          deleteDoc(change.doc.ref);
        }
      });

      if (signals.length > 0) {
        callback(signals);
      }
    }
  );
};
