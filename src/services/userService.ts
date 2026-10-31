import crypto from 'crypto';
import { db as firestoreDb } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { UserRecord } from '../types';

// In-memory caching and fallback layer for resilience
const localUsersByEmail = new Map<string, UserRecord>();
const localUsersById = new Map<string, UserRecord>();

/**
 * Generates a secure salt and derives a cryptographic scrypt hash.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Validates a plaintext password against a salted scrypt hash with constant-time equality.
 */
export async function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!combinedHash || typeof combinedHash !== 'string' || !combinedHash.includes(':')) {
      return resolve(false);
    }
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        if (keyBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Database abstraction layer providing typed collection operations.
 */
export const db = {
  users: {
    /**
     * Inserts a new user record into Firestore and memory cache.
     */
    async insert(user: UserRecord): Promise<void> {
      // Update memory cache immediately
      localUsersByEmail.set(user.email.toLowerCase(), user);
      localUsersById.set(user.id, user);

      try {
        const userRef = doc(firestoreDb, 'users', user.id);
        await setDoc(userRef, {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          plan: user.plan,
          createdAt: user.createdAt
        });
      } catch (err) {
        console.warn('Firestore user insertion warning (cached in memory):', err);
      }
    },

    /**
     * Finds a single user matching query parameters (by email or id).
     */
    async findOne(filter: { email?: string; id?: string }): Promise<UserRecord | null> {
      const emailQuery = filter.email?.toLowerCase();
      if (emailQuery && localUsersByEmail.has(emailQuery)) {
        return localUsersByEmail.get(emailQuery) || null;
      }
      if (filter.id && localUsersById.has(filter.id)) {
        return localUsersById.get(filter.id) || null;
      }

      try {
        if (emailQuery) {
          // Query by lowercase email
          const q = query(collection(firestoreDb, 'users'), where('email', '==', emailQuery));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data() as UserRecord;
            localUsersByEmail.set(emailQuery, data);
            localUsersById.set(data.id, data);
            return data;
          }

          // Fallback check with original casing if different
          if (filter.email && filter.email !== emailQuery) {
            const qOrig = query(collection(firestoreDb, 'users'), where('email', '==', filter.email));
            const snapOrig = await getDocs(qOrig);
            if (!snapOrig.empty) {
              const data = snapOrig.docs[0].data() as UserRecord;
              localUsersByEmail.set(emailQuery, data);
              localUsersById.set(data.id, data);
              return data;
            }
          }
        } else if (filter.id) {
          const userDoc = await getDoc(doc(firestoreDb, 'users', filter.id));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserRecord;
            localUsersByEmail.set(data.email.toLowerCase(), data);
            localUsersById.set(data.id, data);
            return data;
          }
        }
      } catch (err) {
        console.warn('Firestore user findOne query warning:', err);
      }

      return null;
    }
  }
};

/**
 * Registers a new user account with hashed credentials and the default 'free' plan.
 */
export async function registerUser(email: string, password: string): Promise<UserRecord> {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Verify whether email already exists
  const existingUser = await db.users.findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    plan: 'free',
    usage: {
      cases: 0,
      evidence: 0,
      exports: 0,
      ai_summaries: 0,
    },
    createdAt: Date.now()
  };

  await db.users.insert(user);
  return user;
}

/**
 * Authenticates an existing user via email and password verification.
 */
export async function loginUser(email: string, password: string): Promise<UserRecord> {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const user = await db.users.findOne({ email });
  if (!user) throw new Error('User not found');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error('Invalid password');

  return user;
}

// Re-export checkUsageLimit and requirePlan for server & service consumers
export { checkUsageLimit, requirePlan } from '../types';
