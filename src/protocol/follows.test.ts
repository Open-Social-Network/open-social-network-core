import { describe, expect, it } from 'vitest';
import {
  assertOpenSocialNetworkFollowList,
  createFollowList,
  isOpenSocialNetworkFollowList,
} from './follows';

describe('portable follows', () => {
  it('creates a normalized public follow list for a profile owner', () => {
    const followList = createFollowList('ada@example.test', [
      ' https://tommy.example.test/profile.json ',
      'https://tommy.example.test/profile.json',
      {
        profile: 'https://relay.example.test/profile.json',
        handle: 'relay@example.test',
      },
    ]);

    expect(followList).toEqual({
      protocol: 'open-social-network',
      version: '0.1',
      owner: 'ada@example.test',
      follows: [
        {
          profile: 'https://tommy.example.test/profile.json',
        },
        {
          profile: 'https://relay.example.test/profile.json',
          handle: 'relay@example.test',
        },
      ],
    });
    expect(isOpenSocialNetworkFollowList(followList)).toBe(true);
    expect(() => assertOpenSocialNetworkFollowList(followList)).not.toThrow();
  });

  it('rejects malformed follow lists instead of accepting platform-owned state', () => {
    expect(
      isOpenSocialNetworkFollowList({
        protocol: 'open-social-network',
        version: '0.1',
        owner: 'ada@example.test',
        follows: [{ profile: '' }],
      }),
    ).toBe(false);

    expect(() =>
      createFollowList('ada@example.test', [{ profile: '   ' }]),
    ).toThrow('Follow profile URL is required');
  });
});
