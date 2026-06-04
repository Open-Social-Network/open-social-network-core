import type {
  OpenSocialNetworkAction,
  OpenSocialNetworkActionInbox,
  OpenSocialNetworkIdentity,
} from './types';
import { verifyAction } from './public-actions';

export type OpenSocialNetworkActionInboxResult =
  | {
      status: 'accepted';
      inbox: OpenSocialNetworkActionInbox;
    }
  | {
      status: 'duplicate' | 'rejected';
      inbox: OpenSocialNetworkActionInbox;
      reason: string;
    };

export async function acceptActionIntoInbox(
  inbox: OpenSocialNetworkActionInbox,
  action: OpenSocialNetworkAction,
  actorIdentity: OpenSocialNetworkIdentity,
): Promise<OpenSocialNetworkActionInboxResult> {
  if (!isValidInbox(inbox)) {
    return {
      status: 'rejected',
      inbox,
      reason: 'Action inbox is invalid',
    };
  }

  if (action.target.author !== inbox.owner) {
    return {
      status: 'rejected',
      inbox,
      reason: 'Action target does not belong to this inbox',
    };
  }

  if (!(await verifyAction(action, actorIdentity))) {
    return {
      status: 'rejected',
      inbox,
      reason: 'Action signature is invalid',
    };
  }

  if (inbox.actions.some((existingAction) => existingAction.id === action.id)) {
    return {
      status: 'duplicate',
      inbox,
      reason: 'Action already exists in this inbox',
    };
  }

  return {
    status: 'accepted',
    inbox: {
      ...inbox,
      actions: [action, ...inbox.actions],
    },
  };
}

function isValidInbox(inbox: OpenSocialNetworkActionInbox): boolean {
  return (
    inbox.protocol === 'open-social-network' &&
    inbox.version === '0.1' &&
    typeof inbox.owner === 'string' &&
    Array.isArray(inbox.actions)
  );
}
