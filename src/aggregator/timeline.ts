import { verifyPost } from '../protocol/signing';
import { verifyAction } from '../protocol/public-actions';
import type {
  OpenSocialNetworkAction,
  OpenSocialNetworkActionInbox,
  OpenSocialNetworkFeed,
  OpenSocialNetworkIdentity,
  OpenSocialNetworkPost,
} from '../protocol/types';

export type JsonFetcher = (url: string) => Promise<unknown>;

export interface RejectedPost {
  postId: string;
  author: string;
  reason: string;
}

export interface RejectedAction {
  actionId: string;
  actor: string;
  targetAuthor: string;
  reason: string;
}

export interface TimelineFailure {
  source: string;
  reason: string;
}

export interface TimelinePost extends OpenSocialNetworkPost {
  profile: OpenSocialNetworkIdentity;
}

export type TimelineAction = OpenSocialNetworkAction & {
  actorProfile: OpenSocialNetworkIdentity;
  ownerProfile: OpenSocialNetworkIdentity;
};

export interface TimelineResult {
  profiles: OpenSocialNetworkIdentity[];
  posts: TimelinePost[];
  actions: TimelineAction[];
  rejectedPosts: RejectedPost[];
  rejectedActions: RejectedAction[];
  failures: TimelineFailure[];
}

export async function loadVerifiedTimeline(
  profileUrls: string[],
  fetcher: JsonFetcher = fetchJson,
): Promise<TimelineResult> {
  const results = await Promise.all(
    profileUrls.map((profileUrl) => loadProfileFeed(profileUrl, fetcher)),
  );
  const timeline: TimelineResult = {
    profiles: [],
    posts: [],
    actions: [],
    rejectedPosts: [],
    rejectedActions: [],
    failures: [],
  };

  for (const result of results) {
    if ('failure' in result) {
      timeline.failures.push(result.failure);
      continue;
    }

    timeline.profiles.push(result.profile);
    timeline.posts.push(...result.posts);
    timeline.rejectedPosts.push(...result.rejectedPosts);
  }

  const actionResults = await loadProfileActionInboxes(timeline.profiles, fetcher);

  for (const result of actionResults) {
    if ('failure' in result) {
      timeline.failures.push(result.failure);
      continue;
    }

    timeline.actions.push(...result.actions);
    timeline.rejectedActions.push(...result.rejectedActions);
  }

  timeline.posts.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  timeline.actions.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
      right.id.localeCompare(left.id),
  );

  return timeline;
}

async function loadProfileActionInboxes(
  profiles: OpenSocialNetworkIdentity[],
  fetcher: JsonFetcher,
): Promise<
  Array<
    | {
        actions: TimelineAction[];
        rejectedActions: RejectedAction[];
      }
    | { failure: TimelineFailure }
  >
> {
  const profilesByHandle = new Map(profiles.map((profile) => [profile.handle, profile]));

  return Promise.all(
    profiles
      .filter((profile) => typeof profile.endpoints.actions === 'string')
      .map((ownerProfile) => loadProfileActionInbox(ownerProfile, profilesByHandle, fetcher)),
  );
}

async function loadProfileActionInbox(
  ownerProfile: OpenSocialNetworkIdentity,
  profilesByHandle: Map<string, OpenSocialNetworkIdentity>,
  fetcher: JsonFetcher,
): Promise<
  | {
      actions: TimelineAction[];
      rejectedActions: RejectedAction[];
    }
  | { failure: TimelineFailure }
> {
  const actionsUrl = resolveEndpoint(ownerProfile.endpoints.actions as string, ownerProfile.endpoints.profile);

  try {
    const inbox = parseActionInbox(await fetcher(actionsUrl));

    if (inbox.owner !== ownerProfile.handle) {
      return {
        failure: {
          source: actionsUrl,
          reason: `Action inbox owner ${inbox.owner} does not match profile ${ownerProfile.handle}`,
        },
      };
    }

    const actions: TimelineAction[] = [];
    const rejectedActions: RejectedAction[] = [];

    for (const action of inbox.actions) {
      if (action.target.author !== inbox.owner) {
        rejectedActions.push(rejectedAction(action, 'Action target does not match inbox owner'));
        continue;
      }

      const actorProfile = profilesByHandle.get(action.actor);

      if (!actorProfile) {
        rejectedActions.push(rejectedAction(action, 'Actor profile is not loaded'));
        continue;
      }

      if (!(await verifyAction(action, actorProfile))) {
        rejectedActions.push(rejectedAction(action, 'Signature verification failed'));
        continue;
      }

      actions.push({
        ...action,
        actorProfile,
        ownerProfile,
      });
    }

    return { actions, rejectedActions };
  } catch (error) {
    return {
      failure: {
        source: actionsUrl,
        reason: error instanceof Error ? error.message : 'Unknown action inbox loading error',
      },
    };
  }
}

async function loadProfileFeed(
  profileUrl: string,
  fetcher: JsonFetcher,
): Promise<
  | {
      profile: OpenSocialNetworkIdentity;
      posts: TimelinePost[];
      rejectedPosts: RejectedPost[];
    }
  | { failure: TimelineFailure }
> {
  try {
    const profile = parseIdentity(await fetcher(profileUrl));
    const feedUrl = resolveEndpoint(profile.endpoints.feed, profileUrl);
    const feed = parseFeed(await fetcher(feedUrl));

    if (feed.author !== profile.handle) {
      return {
        failure: {
          source: profileUrl,
          reason: `Feed author ${feed.author} does not match profile ${profile.handle}`,
        },
      };
    }

    const posts: TimelinePost[] = [];
    const rejectedPosts: RejectedPost[] = [];

    for (const post of feed.posts) {
      if (await verifyPost(post, profile)) {
        posts.push({ ...post, profile });
      } else {
        rejectedPosts.push({
          postId: post.id,
          author: post.author,
          reason: 'Signature verification failed',
        });
      }
    }

    return { profile, posts, rejectedPosts };
  } catch (error) {
    return {
      failure: {
        source: profileUrl,
        reason: error instanceof Error ? error.message : 'Unknown loading error',
      },
    };
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

function resolveEndpoint(endpoint: string, profileUrl: string): string {
  return new URL(endpoint, profileUrl).toString();
}

function parseIdentity(value: unknown): OpenSocialNetworkIdentity {
  if (!isRecord(value)) {
    throw new Error('Profile response is not an object');
  }

  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.handle !== 'string' ||
    typeof value.name !== 'string' ||
    !isRecord(value.publicKey) ||
    value.publicKey.alg !== 'ES256' ||
    !isRecord(value.publicKey.jwk) ||
    !isRecord(value.endpoints) ||
    typeof value.endpoints.feed !== 'string' ||
    typeof value.endpoints.profile !== 'string'
  ) {
    throw new Error('Profile response is not a valid Open Social Network identity file');
  }

  return value as unknown as OpenSocialNetworkIdentity;
}

function parseFeed(value: unknown): OpenSocialNetworkFeed {
  if (!isRecord(value)) {
    throw new Error('Feed response is not an object');
  }

  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.author !== 'string' ||
    !Array.isArray(value.posts)
  ) {
    throw new Error('Feed response is not a valid Open Social Network feed file');
  }

  return value as unknown as OpenSocialNetworkFeed;
}

function parseActionInbox(value: unknown): OpenSocialNetworkActionInbox {
  if (!isRecord(value)) {
    throw new Error('Action inbox response is not an object');
  }

  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.owner !== 'string' ||
    !Array.isArray(value.actions)
  ) {
    throw new Error('Action inbox response is not a valid Open Social Network action inbox');
  }

  const actions = value.actions.map(parseAction);

  return {
    ...(value as unknown as OpenSocialNetworkActionInbox),
    actions,
  };
}

function parseAction(value: unknown): OpenSocialNetworkAction {
  if (!isRecord(value)) {
    throw new Error('Action inbox contains an action that is not an object');
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.actor !== 'string' ||
    typeof value.createdAt !== 'string' ||
    !isRecord(value.target) ||
    value.target.type !== 'post' ||
    typeof value.target.id !== 'string' ||
    typeof value.target.author !== 'string' ||
    !isRecord(value.signature) ||
    value.signature.alg !== 'ES256' ||
    typeof value.signature.value !== 'string'
  ) {
    throw new Error('Action inbox contains an invalid action record');
  }

  if (
    value.kind === 'reaction' &&
    (value.reaction === 'like' || value.reaction === 'dislike' || value.reaction === 'none')
  ) {
    return value as unknown as OpenSocialNetworkAction;
  }

  if (value.kind === 'comment' && typeof value.content === 'string') {
    return value as unknown as OpenSocialNetworkAction;
  }

  throw new Error('Action inbox contains an invalid action record');
}

function rejectedAction(action: OpenSocialNetworkAction, reason: string): RejectedAction {
  return {
    actionId: action.id,
    actor: action.actor,
    targetAuthor: action.target.author,
    reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
