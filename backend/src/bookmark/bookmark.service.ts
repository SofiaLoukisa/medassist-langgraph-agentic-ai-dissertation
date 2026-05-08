import { db } from "../db/index.js";
import { bookmarks, chatMessages } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export async function createBookmark(
  userId: string,
  messageId: string,
  sessionId: string,
  note?: string
) {
  // Set isBookmarked on the message
  await db
    .update(chatMessages)
    .set({ isBookmarked: true })
    .where(eq(chatMessages.id, messageId));

  const [bookmark] = await db
    .insert(bookmarks)
    .values({ userId, messageId, sessionId, note })
    .returning();

  return bookmark;
}

export async function getBookmarks(userId: string) {
  return db.query.bookmarks.findMany({
    where: eq(bookmarks.userId, userId),
    with: {
      message: true,
      session: true,
    },
    orderBy: desc(bookmarks.createdAt),
  });
}

export async function deleteBookmark(bookmarkId: string, userId: string) {
  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));

  if (!bookmark) return false;

  // Unset isBookmarked on the message
  await db
    .update(chatMessages)
    .set({ isBookmarked: false })
    .where(eq(chatMessages.id, bookmark.messageId));

  await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));
  return true;
}
