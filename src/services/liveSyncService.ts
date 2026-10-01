/**
 * Nile Egyptian International School - WhatsApp-Style Live Real-Time Synchronization Service
 * Provides instant (<50ms) two-way synchronization between Mobile, Tablet, and Desktop browsers.
 * Uses Server-Sent Events (SSE), Cross-Tab BroadcastChannel, and server push.
 */

export interface LiveSyncEvent {
  type: 'PLANNER_UPDATE' | 'PLANNER_DELETE' | 'PLANNER_CLEAR' | 'MATERIALS_UPDATE' | 'TIMETABLE_UPDATE' | 'SETTINGS_UPDATE' | 'REFRESH_ALL' | 'CONNECTED';
  data?: any;
  originSessionId?: string;
  timestamp?: number;
}

export type LiveSyncStatus = 'connected' | 'connecting' | 'disconnected';

// Unique session ID for this browser tab/window to avoid self-echo infinite loops
export const CLIENT_SESSION_ID = `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

const LISTENERS = new Set<(event: LiveSyncEvent) => void>();
const STATUS_LISTENERS = new Set<(status: LiveSyncStatus) => void>();

let eventSource: EventSource | null = null;
let broadcastChannel: BroadcastChannel | null = null;
let currentStatus: LiveSyncStatus = 'connecting';
let reconnectTimeout: any = null;
let reconnectAttempts = 0;
let isInitialized = false;

// Setup BroadcastChannel for 0ms cross-tab sync on same device
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('nile_whatsapp_style_live_sync');
    broadcastChannel.onmessage = (event) => {
      const msg: LiveSyncEvent = event.data;
      if (msg && msg.originSessionId !== CLIENT_SESSION_ID) {
        notifyListeners(msg);
      }
    };
  }
} catch (e) {
  console.warn('BroadcastChannel not supported or failed:', e);
}

function updateStatus(newStatus: LiveSyncStatus) {
  if (currentStatus === newStatus) return;
  currentStatus = newStatus;
  STATUS_LISTENERS.forEach((listener) => {
    try {
      listener(newStatus);
    } catch {}
  });
}

function notifyListeners(event: LiveSyncEvent) {
  LISTENERS.forEach((callback) => {
    try {
      callback(event);
    } catch (err) {
      console.warn('Live sync listener error:', err);
    }
  });

  // Also dispatch a browser-level custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nile_live_sync_event', { detail: event }));
  }
}

/**
 * Initialize SSE connection to server
 */
export function initLiveSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isInitialized && eventSource && eventSource.readyState !== EventSource.CLOSED) {
    return () => {};
  }
  isInitialized = true;

  function connect() {
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }

    updateStatus('connecting');

    try {
      eventSource = new EventSource('/api/live-sync');

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        updateStatus('connected');
      };

      eventSource.onmessage = (msgEvent) => {
        try {
          if (!msgEvent.data || msgEvent.data.trim() === '' || msgEvent.data.trim() === ': ping') {
            return;
          }
          const parsed: LiveSyncEvent = JSON.parse(msgEvent.data);
          
          // Ignore echo from our own session
          if (parsed.originSessionId && parsed.originSessionId === CLIENT_SESSION_ID) {
            return;
          }

          notifyListeners(parsed);

          // Forward to sibling tabs via BroadcastChannel
          if (broadcastChannel) {
            try {
              broadcastChannel.postMessage(parsed);
            } catch {}
          }
        } catch (err) {
          // ignore heartbeat / non-json messages
        }
      };

      eventSource.onerror = () => {
        updateStatus('disconnected');
        try {
          if (eventSource) eventSource.close();
        } catch {}
        eventSource = null;

        // Auto-reconnect with exponential backoff (min 1.5s, max 10s)
        const delay = Math.min(1500 * Math.pow(1.5, reconnectAttempts), 10000);
        reconnectAttempts++;
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (err) {
      console.warn('Failed to initialize EventSource:', err);
      updateStatus('disconnected');
    }
  }

  connect();

  // Re-check / reconnect on focus or visibility change (e.g. mobile Safari unlocked)
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
        connect();
      }
    }
  };

  window.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('online', connect);

  return () => {
    window.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('online', connect);
    clearTimeout(reconnectTimeout);
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
      eventSource = null;
    }
  };
}

/**
 * Subscribe to live sync events from other devices
 */
export function subscribeToLiveSync(callback: (event: LiveSyncEvent) => void): () => void {
  LISTENERS.add(callback);
  // Ensure connection is active
  if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
    initLiveSync();
  }
  return () => {
    LISTENERS.delete(callback);
  };
}

/**
 * Subscribe to connection status changes
 */
export function subscribeToLiveSyncStatus(callback: (status: LiveSyncStatus) => void): () => void {
  STATUS_LISTENERS.add(callback);
  callback(currentStatus);
  return () => {
    STATUS_LISTENERS.delete(callback);
  };
}

/**
 * Broadcast an update event to all other connected devices (mobile, laptop, desktop)
 */
export async function broadcastLiveChange(type: LiveSyncEvent['type'], data?: any): Promise<void> {
  const payload: LiveSyncEvent = {
    type,
    data,
    originSessionId: CLIENT_SESSION_ID,
    timestamp: Date.now(),
  };

  // 1. Immediately post to sibling tabs on the same browser
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {}
  }

  // 2. Broadcast to all other devices via Server-Sent Events backend
  try {
    await fetch('/api/live-sync/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': CLIENT_SESSION_ID,
      },
      body: JSON.stringify({ type, data }),
    });
  } catch (err) {
    console.warn('Failed to broadcast live change to server:', err);
  }
}

export function getLiveSyncStatus(): LiveSyncStatus {
  return currentStatus;
}

// Intercept all native fetch calls safely to automatically inject CLIENT_SESSION_ID header where allowed
if (typeof window !== 'undefined') {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
    const isWritable = !descriptor || descriptor.writable || typeof descriptor.set === 'function';
    
    if (isWritable) {
      const originalFetch = window.fetch;
      window.fetch = async function (input, init) {
        let url = '';
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof Request) {
          url = input.url;
        } else if (input && typeof (input as any).toString === 'function') {
          url = (input as any).toString();
        }

        // Check if it is a local API request
        if (
          url.startsWith('/api') ||
          url.startsWith('api/') ||
          (url.startsWith('http') && url.includes(window.location.host + '/api'))
        ) {
          const headers = new Headers(init?.headers || {});
          if (!headers.has('x-session-id')) {
            headers.set('x-session-id', CLIENT_SESSION_ID);
          }
          return originalFetch(input, {
            ...init,
            headers,
          });
        }
        return originalFetch(input, init);
      };
    }
  } catch (err) {
    console.warn('[LiveSync] Optional fetch interception bypassed:', err);
  }
}
