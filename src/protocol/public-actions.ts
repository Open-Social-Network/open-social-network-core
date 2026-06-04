import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import { actionSigningPayload, canonicalStringify } from './canonical';
import { importPublicKeyJwk } from './keys';
import type {
  OpenSocialNetworkAction,
  OpenSocialNetworkActionTarget,
  OpenSocialNetworkIdentity,
  OpenSocialNetworkReaction,
  UnsignedOpenSocialNetworkAction,
  UnsignedOpenSocialNetworkCommentAction,
  UnsignedOpenSocialNetworkReactionAction,
} from './types';

const SIGNING_ALGORITHM: EcdsaParams = {
  name: 'ECDSA',
  hash: 'SHA-256',
};

export interface OpenSocialNetworkPostActionSummary {
  likes: number;
  dislikes: number;
  reactionsByActor: Record<string, Exclude<OpenSocialNetworkReaction, 'none'>>;
  comments: UnsignedOpenSocialNetworkCommentAction[];
}

export interface OpenSocialNetworkActionCreationOptions {
  id?: string;
  createdAt?: string;
  randomUUID?: () => string;
}

export function createReactionAction(
  actor: string,
  target: OpenSocialNetworkActionTarget,
  reaction: OpenSocialNetworkReaction,
  options: OpenSocialNetworkActionCreationOptions = {},
): UnsignedOpenSocialNetworkReactionAction {
  const createdAt = actionCreatedAt(options.createdAt);

  return {
    id: options.id ?? createActionId('reaction', createdAt, options),
    kind: 'reaction',
    actor,
    createdAt,
    target,
    reaction,
  };
}

export function createCommentAction(
  actor: string,
  target: OpenSocialNetworkActionTarget,
  content: string,
  options: OpenSocialNetworkActionCreationOptions = {},
): UnsignedOpenSocialNetworkCommentAction {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('Comment is required');
  }

  const createdAt = actionCreatedAt(options.createdAt);

  return {
    id: options.id ?? createActionId('comment', createdAt, options),
    kind: 'comment',
    actor,
    createdAt,
    target,
    content: trimmedContent,
  };
}

export function createActionId(
  kind: 'reaction' | 'comment',
  createdAt: string,
  options: Pick<OpenSocialNetworkActionCreationOptions, 'randomUUID'> = {},
): string {
  const timestamp = Date.parse(createdAt);

  if (Number.isNaN(timestamp)) {
    throw new Error('Action createdAt must be a valid date-time string');
  }

  const entropy =
    options.randomUUID?.() ??
    (typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));

  return `${kind}_${timestamp.toString(36)}_${entropy}`;
}

export async function signAction(
  action: UnsignedOpenSocialNetworkAction,
  privateKey: CryptoKey,
): Promise<OpenSocialNetworkAction> {
  const payload = new TextEncoder().encode(canonicalStringify(actionSigningPayload(action)));
  const signature = await crypto.subtle.sign(SIGNING_ALGORITHM, privateKey, payload);

  return {
    ...action,
    signature: {
      alg: 'ES256',
      value: bytesToBase64Url(signature),
    },
  };
}

export async function verifyAction(
  action: OpenSocialNetworkAction,
  identity: OpenSocialNetworkIdentity,
): Promise<boolean> {
  if (action.actor !== identity.handle || action.signature?.alg !== 'ES256') {
    return false;
  }

  try {
    const publicKey = await importPublicKeyJwk(identity.publicKey.jwk);
    const payload = new TextEncoder().encode(canonicalStringify(actionSigningPayload(action)));

    return crypto.subtle.verify(
      SIGNING_ALGORITHM,
      publicKey,
      base64UrlToBytes(action.signature.value),
      payload,
    );
  } catch {
    return false;
  }
}

export function summarizePostActions(
  actions: OpenSocialNetworkAction[],
  target: OpenSocialNetworkActionTarget,
): OpenSocialNetworkPostActionSummary {
  const reactionState = new Map<string, OpenSocialNetworkAction>();
  const comments: UnsignedOpenSocialNetworkCommentAction[] = [];

  for (const action of actions.filter((item) => targetsMatch(item.target, target))) {
    if (action.kind === 'reaction') {
      const previous = reactionState.get(action.actor);

      if (!previous || compareActionOrder(previous, action) <= 0) {
        reactionState.set(action.actor, action);
      }

      continue;
    }

    comments.push(actionSigningPayload(action) as UnsignedOpenSocialNetworkCommentAction);
  }

  const reactionsByActor: Record<string, Exclude<OpenSocialNetworkReaction, 'none'>> = {};

  for (const [actor, action] of reactionState.entries()) {
    if (action.kind === 'reaction' && action.reaction !== 'none') {
      reactionsByActor[actor] = action.reaction;
    }
  }

  comments.sort(compareActionOrder);

  return {
    likes: Object.values(reactionsByActor).filter((reaction) => reaction === 'like').length,
    dislikes: Object.values(reactionsByActor).filter((reaction) => reaction === 'dislike').length,
    reactionsByActor,
    comments,
  };
}

function actionCreatedAt(createdAt?: string): string {
  if (!createdAt) {
    return new Date().toISOString();
  }

  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error('Action createdAt must be a valid date-time string');
  }

  return createdAt;
}

function targetsMatch(left: OpenSocialNetworkActionTarget, right: OpenSocialNetworkActionTarget): boolean {
  return left.type === right.type && left.id === right.id && left.author === right.author;
}

function compareActionOrder(
  left: Pick<UnsignedOpenSocialNetworkAction, 'createdAt' | 'id'>,
  right: Pick<UnsignedOpenSocialNetworkAction, 'createdAt' | 'id'>,
): number {
  const byTime = left.createdAt.localeCompare(right.createdAt);

  if (byTime !== 0) {
    return byTime;
  }

  return left.id.localeCompare(right.id);
}
