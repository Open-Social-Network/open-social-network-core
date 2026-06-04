import { describe, expect, it } from 'vitest';
import { loadVerifiedTimeline } from './timeline';
import { exportPublicKeyJwk, generateIdentityKeyPair } from '../protocol/keys';
import { signAction } from '../protocol/public-actions';
import { signPost } from '../protocol/signing';
import type {
  OpenSocialNetworkActionInbox,
  OpenSocialNetworkActionLog,
  OpenSocialNetworkFeed,
  OpenSocialNetworkIdentity,
  UnsignedOpenSocialNetworkAction,
  UnsignedOpenSocialNetworkPost,
} from '../protocol/types';

describe('loadVerifiedTimeline', () => {
  it('loads followed profiles, keeps verified posts, and sorts newest first', async () => {
    const adaKeys = await generateIdentityKeyPair();
    const tommyKeys = await generateIdentityKeyPair();
    const ada: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'ada@example.test',
      name: 'Ada',
      publicKey: { alg: 'ES256', jwk: await exportPublicKeyJwk(adaKeys.publicKey) },
      endpoints: {
        profile: 'https://ada.example.test/profile.json',
        feed: 'https://ada.example.test/feed.json',
      },
    };
    const tommy: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'tommy@example.test',
      name: 'Tommy',
      publicKey: { alg: 'ES256', jwk: await exportPublicKeyJwk(tommyKeys.publicKey) },
      endpoints: {
        profile: 'https://tommy.example.test/profile.json',
        feed: 'https://tommy.example.test/feed.json',
      },
    };
    const olderPost: UnsignedOpenSocialNetworkPost = {
      id: 'older',
      author: ada.handle,
      createdAt: '2026-06-03T11:00:00.000Z',
      content: 'Older but valid',
    };
    const newestPost = await signPost(
      {
        id: 'newest',
        author: tommy.handle,
        createdAt: '2026-06-03T13:00:00.000Z',
        content: 'Newest valid post',
      },
      tommyKeys.privateKey,
    );
    const tamperedPost = {
      ...(await signPost(olderPost, adaKeys.privateKey)),
      content: 'Tampered later',
    };
    const adaFeed: OpenSocialNetworkFeed = {
      protocol: 'open-social-network',
      version: '0.1',
      author: ada.handle,
      posts: [await signPost(olderPost, adaKeys.privateKey), tamperedPost],
    };
    const tommyFeed: OpenSocialNetworkFeed = {
      protocol: 'open-social-network',
      version: '0.1',
      author: tommy.handle,
      posts: [newestPost],
    };
    const fixtures: Record<string, unknown> = {
      'https://ada.example.test/profile.json': ada,
      'https://ada.example.test/feed.json': adaFeed,
      'https://tommy.example.test/profile.json': tommy,
      'https://tommy.example.test/feed.json': tommyFeed,
    };

    const result = await loadVerifiedTimeline(
      ['https://ada.example.test/profile.json', 'https://tommy.example.test/profile.json'],
      async (url) => fixtures[url],
    );

    expect(result.posts.map((post) => post.id)).toEqual(['newest', 'older']);
    expect(result.profiles.map((profile) => profile.handle)).toEqual([
      'ada@example.test',
      'tommy@example.test',
    ]);
    expect(result.rejectedPosts).toEqual([
      {
        postId: 'older',
        author: 'ada@example.test',
        reason: 'Signature verification failed',
      },
    ]);
    expect(result.failures).toEqual([]);
  });

  it('loads public action inboxes and keeps only actions signed by known profiles', async () => {
    const adaKeys = await generateIdentityKeyPair();
    const tommyKeys = await generateIdentityKeyPair();
    const malloryKeys = await generateIdentityKeyPair();
    const ada = await identityFor('ada@example.test', 'Ada', adaKeys);
    const tommy = await identityFor('tommy@example.test', 'Tommy', tommyKeys, {
      actions: 'https://tommy.example.test/opensocial/actions/inbox/index.json',
    });
    const target = {
      type: 'post' as const,
      id: 'post_1',
      author: tommy.handle,
    };
    const verifiedLike = await signAction(
      actionFor('ada_like', ada.handle, '2026-06-03T12:00:00.000Z', target),
      adaKeys.privateKey,
    );
    const tamperedComment = {
      ...(await signAction(
        {
          id: 'ada_comment',
          kind: 'comment',
          actor: ada.handle,
          createdAt: '2026-06-03T12:01:00.000Z',
          target,
          content: 'Original public comment.',
        },
        adaKeys.privateKey,
      )),
      content: 'Tampered public comment.',
    };
    const unknownActorLike = await signAction(
      actionFor('mallory_like', 'mallory@example.test', '2026-06-03T12:02:00.000Z', target),
      malloryKeys.privateKey,
    );
    const tommyActionInbox: OpenSocialNetworkActionInbox = {
      protocol: 'open-social-network',
      version: '0.1',
      owner: tommy.handle,
      actions: [unknownActorLike, tamperedComment, verifiedLike],
    };
    const fixtures: Record<string, unknown> = {
      'https://ada.example.test/profile.json': ada,
      'https://ada.example.test/feed.json': emptyFeedFor(ada),
      'https://tommy.example.test/profile.json': tommy,
      'https://tommy.example.test/feed.json': emptyFeedFor(tommy),
      'https://tommy.example.test/opensocial/actions/inbox/index.json': tommyActionInbox,
    };

    const result = await loadVerifiedTimeline(
      ['https://ada.example.test/profile.json', 'https://tommy.example.test/profile.json'],
      async (url) => fixtures[url],
    );

    expect(result.actions.map((action) => action.id)).toEqual(['ada_like']);
    expect(result.actions[0].actorProfile.handle).toBe(ada.handle);
    expect(result.actions[0].ownerProfile.handle).toBe(tommy.handle);
    expect(result.rejectedActions).toEqual([
      {
        actionId: 'mallory_like',
        actor: 'mallory@example.test',
        targetAuthor: tommy.handle,
        reason: 'Actor profile is not loaded',
      },
      {
        actionId: 'ada_comment',
        actor: ada.handle,
        targetAuthor: tommy.handle,
        reason: 'Signature verification failed',
      },
    ]);
    expect(result.failures).toEqual([]);
  });

  it('loads public action logs from followed profiles without requiring target inbox delivery', async () => {
    const adaKeys = await generateIdentityKeyPair();
    const tommyKeys = await generateIdentityKeyPair();
    const ada = await identityFor('ada@example.test', 'Ada', adaKeys);
    const tommy = await identityFor('tommy@example.test', 'Tommy', tommyKeys);
    const target = {
      type: 'post' as const,
      id: 'post_1',
      author: tommy.handle,
    };
    const adaLike = await signAction(
      actionFor('ada_like', ada.handle, '2026-06-03T12:00:00.000Z', target),
      adaKeys.privateKey,
    );
    const adaActionLog: OpenSocialNetworkActionLog = {
      protocol: 'open-social-network',
      version: '0.1',
      actor: ada.handle,
      actions: [adaLike],
    };
    const fixtures: Record<string, unknown> = {
      'https://ada.example.test/profile.json': ada,
      'https://ada.example.test/feed.json': emptyFeedFor(ada),
      'https://ada.example.test/opensocial/actions/index.json': adaActionLog,
      'https://tommy.example.test/profile.json': tommy,
      'https://tommy.example.test/feed.json': emptyFeedFor(tommy),
    };

    const result = await loadVerifiedTimeline(
      ['https://ada.example.test/profile.json', 'https://tommy.example.test/profile.json'],
      async (url) => {
        const value = fixtures[url];

        if (value === undefined) {
          throw new Error(`Missing fixture for ${url}`);
        }

        return value;
      },
    );

    expect(result.actions.map((action) => action.id)).toEqual(['ada_like']);
    expect(result.actions[0].actorProfile.handle).toBe(ada.handle);
    expect(result.actions[0].ownerProfile.handle).toBe(tommy.handle);
    expect(result.rejectedActions).toEqual([]);
    expect(result.failures).toEqual([]);
  });

  it('resolves public action logs from the fetched profile URL when profile endpoints are relative', async () => {
    const adaKeys = await generateIdentityKeyPair();
    const tommyKeys = await generateIdentityKeyPair();
    const ada = {
      ...(await identityFor('ada@example.test', 'Ada', adaKeys)),
      endpoints: {
        profile: './profile.json',
        feed: './feed.json',
      },
    } satisfies OpenSocialNetworkIdentity;
    const tommy = {
      ...(await identityFor('tommy@example.test', 'Tommy', tommyKeys)),
      endpoints: {
        profile: './profile.json',
        feed: './feed.json',
      },
    } satisfies OpenSocialNetworkIdentity;
    const target = {
      type: 'post' as const,
      id: 'post_1',
      author: tommy.handle,
    };
    const adaLike = await signAction(
      actionFor('ada_like', ada.handle, '2026-06-03T12:00:00.000Z', target),
      adaKeys.privateKey,
    );
    const adaActionLog: OpenSocialNetworkActionLog = {
      protocol: 'open-social-network',
      version: '0.1',
      actor: ada.handle,
      actions: [adaLike],
    };
    const fixtures: Record<string, unknown> = {
      'https://ada.example.test/profile.json': ada,
      'https://ada.example.test/feed.json': emptyFeedFor(ada),
      'https://ada.example.test/opensocial/actions/index.json': adaActionLog,
      'https://tommy.example.test/profile.json': tommy,
      'https://tommy.example.test/feed.json': emptyFeedFor(tommy),
    };

    const result = await loadVerifiedTimeline(
      ['https://ada.example.test/profile.json', 'https://tommy.example.test/profile.json'],
      async (url) => {
        const value = fixtures[url];

        if (value === undefined) {
          throw new Error(`Missing fixture for ${url}`);
        }

        return value;
      },
    );

    expect(result.actions.map((action) => action.id)).toEqual(['ada_like']);
    expect(result.failures).toEqual([]);
  });
});

async function identityFor(
  handle: string,
  name: string,
  keyPair: CryptoKeyPair,
  endpoints: Partial<OpenSocialNetworkIdentity['endpoints']> = {},
): Promise<OpenSocialNetworkIdentity> {
  return {
    protocol: 'open-social-network',
    version: '0.1',
    handle,
    name,
    publicKey: { alg: 'ES256', jwk: await exportPublicKeyJwk(keyPair.publicKey) },
    endpoints: {
      profile: `https://${handle.replace('@', '.')}/profile.json`,
      feed: `https://${handle.replace('@', '.')}/feed.json`,
      ...endpoints,
    },
  };
}

function emptyFeedFor(identity: OpenSocialNetworkIdentity): OpenSocialNetworkFeed {
  return {
    protocol: 'open-social-network',
    version: '0.1',
    author: identity.handle,
    posts: [],
  };
}

function actionFor(
  id: string,
  actor: string,
  createdAt: string,
  target: UnsignedOpenSocialNetworkAction['target'],
): UnsignedOpenSocialNetworkAction {
  return {
    id,
    kind: 'reaction',
    actor,
    createdAt,
    target,
    reaction: 'like',
  };
}
