import { databases } from "../main.ts";
import { ActivityDocument } from "../types/index.ts";
import { ID, Permission, Role } from "https://deno.land/x/appwrite@9.0.0/mod.ts";
import { logger } from "./logger.ts";

const DATABASE_ID = Deno.env.get("APPWRITE_DATABASE_ID")!;
const ACTIVITIES_COLLECTION_ID = "activities";

/**
 * Log user activity
 */
export async function logActivity(
  userId: string,
  action: string,
  targetId: string,
  targetName: string,
  targetType: "file" | "folder",
  details?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await databases.createDocument(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        action,
        targetId,
        targetName,
        targetType,
        details: details || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId))
      ]
    );
  } catch (error) {
    logger.error("Failed to log activity:", error);
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Get user activities with pagination
 */
export async function getUserActivities(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityDocument[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [
        `equal("userId", "${userId}")`,
        `limit(${limit})`,
        `offset(${offset})`,
        'orderDesc("$createdAt")'
      ]
    );

    return response.documents as ActivityDocument[];
  } catch (error) {
    logger.error("Failed to get user activities:", error);
    return [];
  }
}

/**
 * Clean up old activities (older than 90 days)
 */
export async function cleanupOldActivities(): Promise<void> {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const response = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [
        `lessThan("$createdAt", "${ninetyDaysAgo.toISOString()}")`,
        'limit(100)'
      ]
    );

    for (const activity of response.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        ACTIVITIES_COLLECTION_ID,
        activity.$id
      );
    }

    logger.info(`Cleaned up ${response.documents.length} old activities`);
  } catch (error) {
    logger.error("Failed to cleanup old activities:", error);
  }
}