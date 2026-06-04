import { describe, expect, it } from 'vitest';

import { exportPublicKeyJwk, generateIdentityKeyPair } from './keys';
import { acceptActionIntoInbox } from './action-inbox';
import { signAction } from './public-actions';
import type {
  OpenSocialNetworkActionInbox,
  OpenSocialNetworkIdentity,
  UnsignedOpenSocialNetworkAction,
} from './types';

describe('public action inbox', () => {
  it('accepts a signed public action targeting the inbox owner', async () => {
    const actor = await createIdentity('ada@example.test', 'Ada');
    const inbox: OpenSocialNetworkActionInbox = {
      protocol: 'open-social-network',
      version: '0.1',
      owner: 'tommy@example.test',
      actions: [],
    };
    const action = await signAction(
      actionFor('reaction_1', actor.identity.handle, inbox.owner),
      actor.privateKey,
    );

    await expect(acceptActionIntoInbox(inbox, action, actor.identity)).resolves.toEqual({
      status: 'accepted',
      inbox: {
        ...inbox,
        actions: [action],
      },
    });
  });

  it('does not store duplicate action ids twice', async () => {
    const actor = await createIdentity('ada@example.test', 'Ada');
    const inbox: OpenSocialNetworkActionInbox = {
      protocol: 'open-social-network',
      version: '0.1',
      owner: 'tommy@example.test',
      actions: [],
    };
    const action = await signAction(
      actionFor('reaction_1', actor.identity.handle, inbox.owner),
      actor.privateKey,
    );
    const first = await acceptActionIntoInbox(inbox, action, actor.identity);

    if (first.status !== 'accepted') {
      throw new Error('Expected action to be accepted first');
    }

    await expect(acceptActionIntoInbox(first.inbox, action, actor.identity)).resolves.toEqual({
      status: 'duplicate',
      inbox: first.inbox,
      reason: 'Action already exists in this inbox',
    });
  });

  it('rejects tampered actions and actions targeting another owner', async () => {
    const actor = await createIdentity('ada@example.test', 'Ada');
    const inbox: OpenSocialNetworkActionInbox = {
      protocol: 'open-social-network',
      version: '0.1',
      owner: 'tommy@example.test',
      actions: [],
    };
    const signedAction = await signAction(
      actionFor('reaction_1', actor.identity.handle, inbox.owner),
      actor.privateKey,
    );

    if (signedAction.kind !== 'reaction') {
      throw new Error('Expected a signed reaction action');
    }

    await expect(
      acceptActionIntoInbox(
        inbox,
        {
          ...signedAction,
          reaction: 'dislike',
        },
        actor.identity,
      ),
    ).resolves.toEqual({
      status: 'rejected',
      inbox,
      reason: 'Action signature is invalid',
    });

    const otherTarget = await signAction(
      actionFor('reaction_2', actor.identity.handle, 'other@example.test'),
      actor.privateKey,
    );

    await expect(acceptActionIntoInbox(inbox, otherTarget, actor.identity)).resolves.toEqual({
      status: 'rejected',
      inbox,
      reason: 'Action target does not belong to this inbox',
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

function actionFor(
  id: string,
  actor: string,
  targetAuthor: string,
): UnsignedOpenSocialNetworkAction {
  return {
    id,
    kind: 'reaction',
    actor,
    createdAt: '2026-06-04T12:00:00.000Z',
    target: {
      type: 'post',
      id: 'post_1',
      author: targetAuthor,
    },
    reaction: 'like',
  };
}
