// Supabase Client Initialization
// Supports both browser/Vite and React Native/Expo environments.
// Provides smooth offline/mock simulation fallback if Supabase credentials are not yet set up.

import { createClient } from '@supabase/supabase-js';
import {
  initialProfiles,
  initialAnnouncements,
  initialEvents,
  initialRegistrations,
  initialResources,
  initialNotifications
} from './mockData.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const isRealSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// In-Memory Storage for Demo Mode & Mock Fallback
class MockDatabase {
  constructor() {
    this.storage = {
      profiles: [...initialProfiles],
      announcements: [...initialAnnouncements],
      events: [...initialEvents],
      event_registrations: [...initialRegistrations],
      resources: [...initialResources],
      notifications_log: [...initialNotifications]
    };
    this.subscribers = new Set();
    this.currentUser = initialProfiles[0]; // Default to Ritesh Mishra (Super Admin)
  }

  notify(event, table, record) {
    this.subscribers.forEach((cb) => cb({ eventType: event, table, new: record }));
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }
}

const mockDb = new MockDatabase();

// Mock query builder mimicking Supabase postgrest syntax
const createMockQueryBuilder = (table) => {
  return {
    select(columns = '*') {
      const data = mockDb.storage[table] || [];
      return {
        order(field, { ascending = false } = {}) {
          const sorted = [...data].sort((a, b) => {
            if (a[field] < b[field]) return ascending ? -1 : 1;
            if (a[field] > b[field]) return ascending ? 1 : -1;
            return 0;
          });
          return Promise.resolve({ data: sorted, error: null });
        },
        eq(field, val) {
          const filtered = data.filter((item) => String(item[field]) === String(val));
          return {
            single() {
              return Promise.resolve({ data: filtered[0] || null, error: null });
            },
            then(resolve) {
              resolve({ data: filtered, error: null });
            }
          };
        },
        single() {
          return Promise.resolve({ data: data[0] || null, error: null });
        },
        then(resolve) {
          resolve({ data: [...data], error: null });
        }
      };
    },
    insert(rows) {
      const items = Array.isArray(rows) ? rows : [rows];
      const withIds = items.map((item) => ({
        id: item.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        created_at: new Date().toISOString(),
        ...item
      }));
      mockDb.storage[table] = [...(mockDb.storage[table] || []), ...withIds];
      withIds.forEach((item) => mockDb.notify('INSERT', table, item));
      return {
        select() {
          return {
            single() {
              return Promise.resolve({ data: withIds[0], error: null });
            },
            then(resolve) {
              resolve({ data: withIds, error: null });
            }
          };
        },
        then(resolve) {
          resolve({ data: withIds, error: null });
        }
      };
    },
    update(updates) {
      return {
        eq(field, val) {
          mockDb.storage[table] = (mockDb.storage[table] || []).map((item) => {
            if (String(item[field]) === String(val)) {
              const updated = { ...item, ...updates, updated_at: new Date().toISOString() };
              mockDb.notify('UPDATE', table, updated);
              return updated;
            }
            return item;
          });
          return {
            select() {
              return {
                single() {
                  const updated = mockDb.storage[table].find((i) => String(i[field]) === String(val));
                  return Promise.resolve({ data: updated || null, error: null });
                }
              };
            },
            then(resolve) {
              resolve({ data: mockDb.storage[table], error: null });
            }
          };
        }
      };
    },
    delete() {
      return {
        eq(field, val) {
          mockDb.storage[table] = (mockDb.storage[table] || []).filter(
            (item) => String(item[field]) !== String(val)
          );
          mockDb.notify('DELETE', table, { [field]: val });
          return Promise.resolve({ error: null });
        }
      };
    }
  };
};

// Create real or mock client
export const supabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      isMock: true,
      from: (table) => createMockQueryBuilder(table),
      channel: (name) => {
        return {
          on: (event, filter, callback) => {
            const listener = (payload) => {
              if (!filter.table || filter.table === payload.table) {
                callback(payload);
              }
            };
            mockDb.subscribers.add(listener);
            return {
              subscribe: () => {
                return {
                  unsubscribe: () => mockDb.subscribers.delete(listener)
                };
              }
            };
          },
          subscribe: () => ({
            unsubscribe: () => {}
          })
        };
      },
      auth: {
        getUser: async () => ({
          data: { user: mockDb.currentUser ? { id: mockDb.currentUser.id, email: mockDb.currentUser.email } : null },
          error: null
        }),
        getSession: async () => ({
          data: { session: mockDb.currentUser ? { user: mockDb.currentUser } : null },
          error: null
        }),
        onAuthStateChange: (cb) => {
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithPassword: async ({ email }) => {
          const matched = mockDb.storage.profiles.find((p) => p.email === email) || mockDb.storage.profiles[0];
          mockDb.setCurrentUser(matched);
          return { data: { user: matched, session: { user: matched } }, error: null };
        },
        signUp: async ({ email, password, options }) => {
          const newProfile = {
            id: `user-${Date.now()}`,
            full_name: options?.data?.full_name || email.split('@')[0],
            email,
            role: 'member',
            department: options?.data?.department || 'Computer Science',
            avatar_url: options?.data?.avatar_url || null,
            created_at: new Date().toISOString()
          };
          mockDb.storage.profiles.push(newProfile);
          mockDb.setCurrentUser(newProfile);
          return { data: { user: newProfile, session: { user: newProfile } }, error: null };
        },
        signOut: async () => {
          mockDb.setCurrentUser(null);
          return { error: null };
        }
      },
      storage: {
        from: (bucket) => ({
          upload: async (path, file) => {
            const publicUrl = `https://mock-storage.atc.internal/${bucket}/${path}`;
            return { data: { path, publicUrl }, error: null };
          },
          getPublicUrl: (path) => ({
            data: { publicUrl: `https://mock-storage.atc.internal/${bucket}/${path}` }
          })
        })
      }
    };

export const isLiveSupabase = isRealSupabaseConfigured;
export { mockDb };

// Firebase Auth + Supabase JWT Bridge Client Factory
// Passes Firebase ID Token to Supabase as Bearer token to satisfy RLS policies using auth.uid()
export function getSupabaseClient(firebaseIdToken) {
  if (!isRealSupabaseConfigured) {
    return supabase;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: firebaseIdToken ? { Authorization: `Bearer ${firebaseIdToken}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
  });
}

// Executes a query with an auto-refreshed Firebase ID token
export async function supabaseQuery(firebaseUser, queryFn) {
  if (!firebaseUser) {
    return queryFn(supabase);
  }
  try {
    const token = typeof firebaseUser.getIdToken === 'function'
      ? await firebaseUser.getIdToken()
      : null;
    const client = getSupabaseClient(token);
    return queryFn(client);
  } catch (err) {
    console.warn('[ATC Supabase] Error acquiring Firebase ID token:', err);
    return queryFn(supabase);
  }
}

export default supabase;
