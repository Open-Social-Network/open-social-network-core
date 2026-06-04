import { describe, expect, it } from 'vitest';
import {
  exportPublicKeyJwk,
  generateIdentityKeyPair,
  generateMessageKeyPair,
} from './keys';
import {
  decryptDirectMessage,
  encryptDirectMessage,
  verifyDirectMessage,
} from './direct-messages';
import type { OpenSocialNetworkIdentity } from './types';

describe('encrypted direct messages', () => {
  it('encrypts, signs, verifies, and decrypts a direct message for the intended recipient', async () => {
    const senderKeys = await generateIdentityKeyPair();
    const recipientMessageKeys = await generateMessageKeyPair();
    const sender = await createIdentity('ada@example.test', 'Ada', senderKeys.publicKey);

    const message = await encryptDirectMessage(
      {
        id: 'dm_001',
        sender: sender.handle,
        recipient: 'tommy@example.test',
        createdAt: '2026-06-03T12:00:00.000Z',
      },
      'This is private and portable.',
      senderKeys.privateKey,
      recipientMessageKeys.publicKey,
    );

    expect(JSON.stringify(message)).not.toContain('This is private and portable.');
    await expect(verifyDirectMessage(message, sender)).resolves.toBe(true);
    await expect(
      decryptDirectMessage(message, recipientMessageKeys.privateKey, sender),
    ).resolves.toBe('This is private and portable.');
  });

  it('rejects tampered direct messages and wrong recipient keys', async () => {
    const senderKeys = await generateIdentityKeyPair();
    const recipientMessageKeys = await generateMessageKeyPair();
    const wrongRecipientKeys = await generateMessageKeyPair();
    const sender = await createIdentity('ada@example.test', 'Ada', senderKeys.publicKey);
    const message = await encryptDirectMessage(
      {
        id: 'dm_001',
        sender: sender.handle,
        recipient: 'tommy@example.test',
        createdAt: '2026-06-03T12:00:00.000Z',
      },
      'Only Tommy can read this.',
      senderKeys.privateKey,
      recipientMessageKeys.publicKey,
    );

    await expect(
      verifyDirectMessage({ ...message, recipient: 'mallory@example.test' }, sender),
    ).resolves.toBe(false);
    await expect(
      decryptDirectMessage(message, wrongRecipientKeys.privateKey, sender),
    ).rejects.toThrow('Direct message could not be decrypted');
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
