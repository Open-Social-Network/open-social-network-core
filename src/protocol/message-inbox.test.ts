import { describe, expect, it } from 'vitest';
import { encryptDirectMessage } from './direct-messages';
import {
  exportPublicKeyJwk,
  generateIdentityKeyPair,
  generateMessageKeyPair,
} from './keys';
import { acceptDirectMessageIntoInbox } from './message-inbox';
import type { OpenSocialNetworkDirectMessageLog, OpenSocialNetworkIdentity } from './types';

describe('encrypted direct message inbox', () => {
  it('accepts a signed encrypted message for the inbox owner', async () => {
    const senderKeys = await generateIdentityKeyPair();
    const recipientMessageKeys = await generateMessageKeyPair();
    const sender = await createIdentity('ada@example.test', 'Ada', senderKeys.publicKey);
    const inbox: OpenSocialNetworkDirectMessageLog = {
      protocol: 'open-social-network',
      version: '0.1',
      owner: 'tommy@example.test',
      messages: [],
    };
    const message = await encryptDirectMessage(
      {
        id: 'dm_001',
        sender: sender.handle,
        recipient: inbox.owner,
        createdAt: '2026-06-04T12:00:00.000Z',
      },
      'This stays encrypted in public storage.',
      senderKeys.privateKey,
      recipientMessageKeys.publicKey,
    );

    await expect(acceptDirectMessageIntoInbox(inbox, message, sender)).resolves.toEqual({
      status: 'accepted',
      inbox: {
        ...inbox,
        messages: [message],
      },
    });
  });

  it('rejects duplicate messages, wrong recipients, and invalid signatures', async () => {
    const senderKeys = await generateIdentityKeyPair();
    const recipientMessageKeys = await generateMessageKeyPair();
    const sender = await createIdentity('ada@example.test', 'Ada', senderKeys.publicKey);
    const otherSender = await createIdentity('mallory@example.test', 'Mallory', senderKeys.publicKey);
    const inbox: OpenSocialNetworkDirectMessageLog = {
      protocol: 'open-social-network',
      version: '0.1',
      owner: 'tommy@example.test',
      messages: [],
    };
    const message = await encryptDirectMessage(
      {
        id: 'dm_001',
        sender: sender.handle,
        recipient: inbox.owner,
        createdAt: '2026-06-04T12:00:00.000Z',
      },
      'This stays encrypted in public storage.',
      senderKeys.privateKey,
      recipientMessageKeys.publicKey,
    );
    const first = await acceptDirectMessageIntoInbox(inbox, message, sender);

    if (first.status !== 'accepted') {
      throw new Error('Expected first message to be accepted');
    }

    await expect(acceptDirectMessageIntoInbox(first.inbox, message, sender)).resolves.toEqual({
      status: 'duplicate',
      inbox: first.inbox,
      reason: 'Message already exists in this inbox',
    });
    await expect(
      acceptDirectMessageIntoInbox(
        inbox,
        {
          ...message,
          id: 'dm_wrong_recipient',
          recipient: 'other@example.test',
        },
        sender,
      ),
    ).resolves.toEqual({
      status: 'rejected',
      inbox,
      reason: 'Message recipient does not belong to this inbox',
    });
    await expect(acceptDirectMessageIntoInbox(inbox, message, otherSender)).resolves.toEqual({
      status: 'rejected',
      inbox,
      reason: 'Message signature is invalid',
    });
  });
});

async function createIdentity(
  handle: string,
  name: string,
  publicKey: CryptoKey,
): Promise<OpenSocialNetworkIdentity> {
  return {
    protocol: 'open-social-network',
    version: '0.1',
    handle,
    name,
    publicKey: {
      alg: 'ES256',
      jwk: await exportPublicKeyJwk(publicKey),
    },
    endpoints: {
      profile: `https://${handle}/profile.json`,
      feed: `https://${handle}/feed.json`,
    },
  };
}
