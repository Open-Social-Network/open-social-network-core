import { describe, expect, it } from 'vitest';
import { exportPublicKeyJwk, generateIdentityKeyPair } from './keys';
import {
  summarizePostActions,
  signAction,
  verifyAction,
} from './public-actions';
import type {
  OpenSocialNetworkIdentity,
  UnsignedOpenSocialNetworkAction,
} from './types';

describe('signed public actions', () => {
  it('verifies a reaction signed by the actor identity', async () => {
    const { identity, privateKey } = await createIdentity('ada@example.test', 'Ada');
    const action: UnsignedOpenSocialNetworkAction = {
      id: 'action_1',
      kind: 'reaction',
      actor: identity.handle,
      createdAt: '2026-06-03T12:00:00.000Z',
      target: {
        type: 'post',
        id: 'post_1',
        author: 'tommy@example.test',
      },
      reaction: 'like',
    };

    const signedAction = await signAction(action, privateKey);

    await expect(verifyAction(signedAction, identity)).resolves.toBe(true);
  });

  it('rejects action tampering after signing', async () => {
    const { identity, privateKey } = await createIdentity('ada@example.test', 'Ada');
    const signedAction = await signAction(
      {
        id: 'action_1',
        kind: 'comment',
        actor: identity.handle,
        createdAt: '2026-06-03T12:00:00.000Z',
        target: {
          type: 'post',
          id: 'post_1',
          author: 'tommy@example.test',
        },
        content: 'This should travel with the protocol.',
      },
      privateKey,
    );

    if (signedAction.kind !== 'comment') {
      throw new Error('Expected a signed comment action');
    }

    await expect(
      verifyAction(
        {
          ...signedAction,
          content: 'Edited by somebody else.',
        },
        identity,
      ),
    ).resolves.toBe(false);
  });

  it('uses the latest reaction per actor and target while preserving comments', async () => {
    const ada = await createIdentity('ada@example.test', 'Ada');
    const tommy = await createIdentity('tommy@example.test', 'Tommy');
    const target = {
      type: 'post' as const,
      id: 'post_1',
      author: 'open@example.test',
    };

    const actions = [
      await signAction(
        {
          id: 'ada_like',
          kind: 'reaction',
          actor: ada.identity.handle,
          createdAt: '2026-06-03T12:00:00.000Z',
          target,
          reaction: 'like',
        },
        ada.privateKey,
      ),
      await signAction(
        {
          id: 'ada_dislike',
          kind: 'reaction',
          actor: ada.identity.handle,
          createdAt: '2026-06-03T12:01:00.000Z',
          target,
          reaction: 'dislike',
        },
        ada.privateKey,
      ),
      await signAction(
        {
          id: 'tommy_like',
          kind: 'reaction',
          actor: tommy.identity.handle,
          createdAt: '2026-06-03T12:02:00.000Z',
          target,
          reaction: 'like',
        },
        tommy.privateKey,
      ),
      await signAction(
        {
          id: 'ada_comment',
          kind: 'comment',
          actor: ada.identity.handle,
          createdAt: '2026-06-03T12:03:00.000Z',
          target,
          content: 'Portable comments should be just signed public actions.',
        },
        ada.privateKey,
      ),
      await signAction(
        {
          id: 'ada_none',
          kind: 'reaction',
          actor: ada.identity.handle,
          createdAt: '2026-06-03T12:04:00.000Z',
          target,
          reaction: 'none',
        },
        ada.privateKey,
      ),
    ];

    expect(summarizePostActions(actions, target)).toMatchObject({
      likes: 1,
      dislikes: 0,
      comments: [
        {
          id: 'ada_comment',
          actor: 'ada@example.test',
          content: 'Portable comments should be just signed public actions.',
        },
      ],
    });
  });
});

async function createIdentity(
  handle: string,
  name: string,
): Promise<{ identity: OpenSocialNetworkIdentity; privateKey: CryptoKey }> {
  const keyPair = await generateIdentityKeyPair();

  return {
    identity: {
      protocol: 'open-social-network',
      version: '0.1',
      handle,
      name,
      publicKey: {
        alg: 'ES256',
        jwk: await exportPublicKeyJwk(keyPair.publicKey),
      },
      endpoints: {
        profile: `https://${handle}/profile.json`,
        feed: `https://${handle}/feed.json`,
      },
    },
    privateKey: keyPair.privateKey,
  };
}
