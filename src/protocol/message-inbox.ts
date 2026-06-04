import { verifyDirectMessage } from './direct-messages';
import type {
  OpenSocialNetworkDirectMessage,
  OpenSocialNetworkDirectMessageLog,
  OpenSocialNetworkIdentity,
} from './types';

export type OpenSocialNetworkMessageInboxResult =
  | {
      status: 'accepted';
      inbox: OpenSocialNetworkDirectMessageLog;
    }
  | {
      status: 'duplicate' | 'rejected';
      inbox: OpenSocialNetworkDirectMessageLog;
      reason: string;
    };

export async function acceptDirectMessageIntoInbox(
  inbox: OpenSocialNetworkDirectMessageLog,
  message: OpenSocialNetworkDirectMessage,
  senderIdentity: OpenSocialNetworkIdentity,
): Promise<OpenSocialNetworkMessageInboxResult> {
  if (!isValidMessageInbox(inbox)) {
    return {
      status: 'rejected',
      inbox,
      reason: 'Message inbox is invalid',
    };
  }

  if (message.recipient !== inbox.owner) {
    return {
      status: 'rejected',
      inbox,
      reason: 'Message recipient does not belong to this inbox',
    };
  }

  if (!(await verifyDirectMessage(message, senderIdentity))) {
    return {
      status: 'rejected',
      inbox,
      reason: 'Message signature is invalid',
    };
  }

  if (inbox.messages.some((existingMessage) => existingMessage.id === message.id)) {
    return {
      status: 'duplicate',
      inbox,
      reason: 'Message already exists in this inbox',
    };
  }

  return {
    status: 'accepted',
    inbox: {
      ...inbox,
      messages: [message, ...inbox.messages],
    },
  };
}

function isValidMessageInbox(inbox: OpenSocialNetworkDirectMessageLog): boolean {
  return (
    inbox.protocol === 'open-social-network' &&
    inbox.version === '0.1' &&
    typeof inbox.owner === 'string' &&
    Array.isArray(inbox.messages)
  );
}
