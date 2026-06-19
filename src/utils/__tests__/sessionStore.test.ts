import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemorySessionStore } from '../sessionStore.js';
import type { PostSession } from '../../types/index.js';

const sampleSession = (status: PostSession['status']): PostSession => ({
  userId: 'U123',
  imageS3Key: 'uploads/test.jpg',
  imageUrl: 'https://example.com/test.jpg',
  dishes: ['滷肉飯'],
  captions: {
    instagram: { caption: 'ig', hashtags: '#a' },
    facebook: { caption: 'fb', hashtags: '#b' },
    threads: { caption: 'th', hashtags: '#c' },
  },
  createdAt: new Date(),
  status,
});

describe('InMemorySessionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('supports set, get, delete, and overwrite', () => {
    const store = new InMemorySessionStore();
    const session = sampleSession('pending_confirm');

    store.set('U123', session);
    expect(store.get('U123')).toEqual(session);

    const updated = { ...session, status: 'publishing' as const };
    store.set('U123', updated);
    expect(store.get('U123')?.status).toBe('publishing');

    store.delete('U123');
    expect(store.get('U123')).toBeUndefined();
  });

  it('cleans expired pending_dish_confirm sessions and calls onExpire', async () => {
    const onExpire = vi.fn();
    const store = new InMemorySessionStore({
      ttlMs: 1000,
      onExpire,
    });

    const session = {
      ...sampleSession('pending_dish_confirm'),
      createdAt: new Date(Date.now() - 2000),
    };
    store.set('U123', session);

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(onExpire).toHaveBeenCalledWith(session);
    expect(store.get('U123')).toBeUndefined();
  });

  it('cleans expired pending_dish_input sessions and calls onExpire', async () => {
    const onExpire = vi.fn();
    const store = new InMemorySessionStore({
      ttlMs: 1000,
      onExpire,
    });

    const session = {
      ...sampleSession('pending_dish_input'),
      createdAt: new Date(Date.now() - 2000),
    };
    store.set('U123', session);

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(onExpire).toHaveBeenCalledWith(session);
    expect(store.get('U123')).toBeUndefined();
  });

  it('cleans expired pending_confirm sessions and calls onExpire', async () => {
    const onExpire = vi.fn();
    const store = new InMemorySessionStore({
      ttlMs: 1000,
      onExpire,
    });

    const session = {
      ...sampleSession('pending_confirm'),
      createdAt: new Date(Date.now() - 2000),
    };
    store.set('U123', session);

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(onExpire).toHaveBeenCalledWith(session);
    expect(store.get('U123')).toBeUndefined();
  });

  it('cleans expired pending_edit sessions and calls onExpire', async () => {
    const onExpire = vi.fn();
    const store = new InMemorySessionStore({
      ttlMs: 1000,
      onExpire,
    });

    const session = {
      ...sampleSession('pending_edit'),
      createdAt: new Date(Date.now() - 2000),
    };
    store.set('U123', session);

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(onExpire).toHaveBeenCalledWith(session);
    expect(store.get('U123')).toBeUndefined();
  });

  it('does not clean publishing sessions on TTL', async () => {
    const onExpire = vi.fn();
    const store = new InMemorySessionStore({
      ttlMs: 1000,
      onExpire,
    });

    const session = {
      ...sampleSession('publishing'),
      createdAt: new Date(Date.now() - 2000),
    };
    store.set('U123', session);

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(onExpire).not.toHaveBeenCalled();
    expect(store.get('U123')).toBeDefined();
  });

  it('clears session when onExpire throws', async () => {
    const store = new InMemorySessionStore({
      ttlMs: 1000,
      onExpire: () => {
        throw new Error('delete failed');
      },
    });

    const session = {
      ...sampleSession('pending_confirm'),
      createdAt: new Date(Date.now() - 2000),
    };
    store.set('U123', session);

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(store.get('U123')).toBeUndefined();
  });
});
