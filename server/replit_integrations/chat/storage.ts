import { asc, desc, eq } from "drizzle-orm";
import { db, ensureDatabaseReady } from "../../db";
import {
  conversations,
  messages,
  type Conversation,
  type Message,
} from "@shared/schema";

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
}

async function getDbOrThrow() {
  if (!db) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL to enable chat storage.");
  }

  await ensureDatabaseReady();
  return db;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const database = await getDbOrThrow();
    const [conversation] = await database
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return conversation;
  },

  async getAllConversations() {
    const database = await getDbOrThrow();
    return database
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt), desc(conversations.id));
  },

  async createConversation(title: string) {
    const database = await getDbOrThrow();
    const [conversation] = await database
      .insert(conversations)
      .values({
        title,
        createdAt: new Date(),
      })
      .returning();

    if (!conversation) {
      throw new Error("Failed to create conversation.");
    }

    return conversation;
  },

  async deleteConversation(id: number) {
    const database = await getDbOrThrow();
    await database.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    const database = await getDbOrThrow();
    return database
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt), asc(messages.id));
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const database = await getDbOrThrow();
    const [message] = await database
      .insert(messages)
      .values({
        conversationId,
        role,
        content,
        createdAt: new Date(),
      })
      .returning();

    if (!message) {
      throw new Error("Failed to create message.");
    }

    return message;
  },
};
