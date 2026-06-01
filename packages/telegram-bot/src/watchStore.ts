export interface WatchSubscription {
  telegram_user_id: number;
  chat_id: number;
  market_id: number;
  last_status: string | null;
  last_notified_at?: string | null;
}

export interface WatchStore {
  enabled: boolean;
  add(input: Omit<WatchSubscription, 'last_status' | 'last_notified_at'> & { last_status?: string | null }): Promise<void>;
  remove(input: { telegram_user_id: number; chat_id: number; market_id: number }): Promise<void>;
  listForChat(input: { telegram_user_id: number; chat_id: number }): Promise<WatchSubscription[]>;
  listAll(): Promise<WatchSubscription[]>;
  updateStatus(input: { telegram_user_id: number; chat_id: number; market_id: number; last_status: string }): Promise<void>;
}

function watchKey(input: { telegram_user_id: number; chat_id: number; market_id: number }): string {
  return `${input.telegram_user_id}:${input.chat_id}:${input.market_id}`;
}

export class MemoryWatchStore implements WatchStore {
  enabled = false;
  private watches = new Map<string, WatchSubscription>();

  async add(input: Omit<WatchSubscription, 'last_status' | 'last_notified_at'> & { last_status?: string | null }): Promise<void> {
    this.watches.set(watchKey(input), {
      telegram_user_id: input.telegram_user_id,
      chat_id: input.chat_id,
      market_id: input.market_id,
      last_status: input.last_status ?? null,
      last_notified_at: null,
    });
  }

  async remove(input: { telegram_user_id: number; chat_id: number; market_id: number }): Promise<void> {
    this.watches.delete(watchKey(input));
  }

  async listForChat(input: { telegram_user_id: number; chat_id: number }): Promise<WatchSubscription[]> {
    return [...this.watches.values()].filter(
      (watch) => watch.telegram_user_id === input.telegram_user_id && watch.chat_id === input.chat_id,
    );
  }

  async listAll(): Promise<WatchSubscription[]> {
    return [...this.watches.values()];
  }

  async updateStatus(input: { telegram_user_id: number; chat_id: number; market_id: number; last_status: string }): Promise<void> {
    const key = watchKey(input);
    const existing = this.watches.get(key);
    if (!existing) return;
    this.watches.set(key, {
      ...existing,
      last_status: input.last_status,
      last_notified_at: new Date().toISOString(),
    });
  }
}

export class SupabaseWatchStore implements WatchStore {
  enabled = true;

  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async add(input: Omit<WatchSubscription, 'last_status' | 'last_notified_at'> & { last_status?: string | null }): Promise<void> {
    await this.request('telegram_watch_subscriptions?on_conflict=telegram_user_id,chat_id,market_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        telegram_user_id: input.telegram_user_id,
        chat_id: input.chat_id,
        market_id: input.market_id,
        last_status: input.last_status ?? null,
      }),
    });
  }

  async remove(input: { telegram_user_id: number; chat_id: number; market_id: number }): Promise<void> {
    await this.request(
      `telegram_watch_subscriptions?telegram_user_id=eq.${input.telegram_user_id}&chat_id=eq.${input.chat_id}&market_id=eq.${input.market_id}`,
      { method: 'DELETE' },
    );
  }

  async listForChat(input: { telegram_user_id: number; chat_id: number }): Promise<WatchSubscription[]> {
    return this.request(
      `telegram_watch_subscriptions?telegram_user_id=eq.${input.telegram_user_id}&chat_id=eq.${input.chat_id}&select=*`,
    );
  }

  async listAll(): Promise<WatchSubscription[]> {
    return this.request('telegram_watch_subscriptions?select=*');
  }

  async updateStatus(input: { telegram_user_id: number; chat_id: number; market_id: number; last_status: string }): Promise<void> {
    await this.request(
      `telegram_watch_subscriptions?telegram_user_id=eq.${input.telegram_user_id}&chat_id=eq.${input.chat_id}&market_id=eq.${input.market_id}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          last_status: input.last_status,
          last_notified_at: new Date().toISOString(),
        }),
      },
    );
  }
}

export function createWatchStore(config: {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}): WatchStore {
  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    return new SupabaseWatchStore(config.supabaseUrl, config.supabaseServiceRoleKey);
  }

  return new MemoryWatchStore();
}
