import type { IsoDateString } from './common';

export const MESSAGE_LIMITS = { maxBody: 4000, pageSize: 30 } as const;

export interface MessageDto {
  id: string;
  senderId: string;
  /** True when the signed-in user sent it. */
  mine: boolean;
  body: string;
  createdAt: IsoDateString;
}

/**
 * One page of a thread, oldest first. `olderCursor` is the id to pass as `before` for the previous page
 * (null at the start). `otherReadAt` is the other participant's read pointer: any message of mine at or
 * before it has been read.
 */
export interface MessageThreadDto {
  conversationId: string;
  otherName: string;
  messages: MessageDto[];
  olderCursor: string | null;
  otherReadAt: IsoDateString | null;
}

export interface ConversationSummaryDto {
  clientId: string;
  clientName: string;
  lastMessage: string | null;
  lastMessageAt: IsoDateString | null;
  unread: number;
}

export interface CoachInboxDto {
  conversations: ConversationSummaryDto[];
  totalUnread: number;
}

export interface SendMessageRequest {
  body: string;
}

/** Query for a thread page: `before` loads older history, `after` polls for newer messages. Never both. */
export interface ThreadQuery {
  before?: string;
  after?: string;
}

/** True once the other participant has read my message. */
export const isReadByOther = (message: Pick<MessageDto, 'createdAt' | 'mine'>, otherReadAt: string | null): boolean =>
  message.mine && otherReadAt !== null && Date.parse(message.createdAt) <= Date.parse(otherReadAt);
