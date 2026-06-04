import { describe, expect, it } from 'vitest';

import type { OpenSocialNetworkIdentity } from './types';

describe('profile endpoints', () => {
  it('supports portable public action and encrypted message inbox endpoints', () => {
    const profile: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'ada@example.test',
      name: 'Ada',
      publicKey: {
        alg: 'ES256',
        jwk: {
          kty: 'EC',
          crv: 'P-256',
          x: 'public-x',
          y: 'public-y',
        },
      },
      endpoints: {
        profile: '/profile.json',
        feed: '/feed.json',
        actions: '/opensocial/actions/inbox/index.json',
        messages: '/opensocial/messages/inbox/index.json',
      },
    };

    expect(profile.endpoints.actions).toBe('/opensocial/actions/inbox/index.json');
    expect(profile.endpoints.messages).toBe('/opensocial/messages/inbox/index.json');
  });
});
