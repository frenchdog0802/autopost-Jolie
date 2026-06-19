import type { PostSession } from '../types/index.js';
import type { ISessionStore } from '../types/index.js';
import type { Logger } from 'pino';

const CLEANUP_INTERVAL_MS = 60_000;

export interface SessionStoreOptions {
  ttlMs?: number;
  onExpire?: (session: PostSession) => void | Promise<void>;
  logger?: Logger;
}

/**
 * In-memory session store with TTL cleanup for pending confirmations.
 */
export class InMemorySessionStore implements ISessionStore {
  private readonly store = new Map<string, PostSession>();
  private readonly ttlMs: number;
  private readonly onExpire?: (session: PostSession) => void | Promise<void>;
  private readonly logger?: Logger;
  private cleanupInterval: ReturnType<typeof setInterval> | undefined;

  constructor(options: SessionStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 600_000;
    this.onExpire = options.onExpire;
    this.logger = options.logger;
    this.cleanupInterval = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);
  }

  get(userId: string): PostSession | undefined {
    return this.store.get(userId);
  }

  set(userId: string, session: PostSession): void {
    this.store.set(userId, session);
  }

  delete(userId: string): void {
    this.store.delete(userId);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();

    for (const [userId, session] of this.store.entries()) {
      if (
        session.status !== 'pending_dish_confirm' &&
        session.status !== 'pending_dish_input' &&
        session.status !== 'pending_confirm' &&
        session.status !== 'pending_edit'
      ) {
        continue;
      }

      if (now - session.createdAt.getTime() < this.ttlMs) {
        continue;
      }

      if (this.onExpire) {
        try {
          await this.onExpire(session);
        } catch (error) {
          this.logger?.error(
            { err: error, userId, imageS3Key: session.imageS3Key },
            'Session expire callback failed',
          );
        }
      }

      this.store.delete(userId);
    }
  }
}
