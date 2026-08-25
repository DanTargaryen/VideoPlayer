import { afterEach, describe, expect, it, vi } from 'vitest';

import { mergeUniqueById, shuffleItems, takeRandomItems } from './randomVideos';

describe('random video helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shuffles a copy without mutating the input', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const source = [1, 2, 3, 4];

    const result = shuffleItems(source);

    expect(result).not.toBe(source);
    expect(source).toEqual([1, 2, 3, 4]);
    expect([...result].sort()).toEqual(source);
  });

  it('returns at most the requested number of random items', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(takeRandomItems(['a', 'b', 'c'], 2)).toHaveLength(2);
    expect(takeRandomItems(['a'], 5)).toEqual(['a']);
  });

  it('merges groups by id while preserving the first occurrence', () => {
    const first = { id: 1, title: 'first' };
    const duplicate = { id: 1, title: 'duplicate' };
    const second = { id: 2, title: 'second' };

    expect(mergeUniqueById([[first], [duplicate, second]])).toEqual([first, second]);
  });
});
