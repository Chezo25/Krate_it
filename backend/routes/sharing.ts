import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { databases } from "../main.ts";
import { requireAuth } from "../middleware/auth.ts";
import { logger } from "../utils/logger.ts";
import { ShareDocument, ApiResponse } from "../types/index.ts";
import { Query, Permission, Role, ID } from "https://deno.land/x/appwrite@9.0.0/mod.ts";
import { generateShareToken } from "../utils/crypto.ts";
import { logActivity } from "../utils/activity.ts";

export const sharingRouter = new Router({ prefix: "/api/sharing" });

const DATABASE_ID = Deno.env.get("APPWRITE_DATABASE_ID")!;
const FILES_COLLECTION_ID = "files";
const FOLDERS_COLLECTION_ID = "folders";
const SHARES_COLLECTION_ID = "shares";

// Create share link
sharingRouter.post("/", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const body = await ctx.request.body().value;
    const { 
      resourceId, 
      resourceType, 
      permissions = ["read"], 
      expiresAt,
      isPublic = true,
      sharedWithEmail 
    } = body;

    if (!resourceId || !resourceType) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Resource ID and type are required"
      };
      return;
    }

    // Verify ownership of the resource
    const collectionId = resourceType === "file" ? FILES_COLLECTION_ID : FOLDERS_COLLECTION_ID;
    const resource = await databases.getDocument(DATABASE_ID, collectionId, resourceId);
    
    if (resource.userId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Generate share token
    const token = generateShareToken();

    // Create share document
    const share = await databases.createDocument(
      DATABASE_ID,
      SHARES_COLLECTION_ID,
      ID.unique(),
      {
        resourceId,
        resourceType,
        ownerId: auth.userId,
        sharedWithEmail: sharedWithEmail || null,
        permissions,
        token,
        expiresAt: expiresAt || null,
        isPublic
      },
      [
        Permission.read(Role.user(auth.userId)),
        Permission.update(Role.user(auth.userId)),
        Permission.delete(Role.user(auth.userId))
      ]
    );

    // Update resource to mark as shared
    await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      resourceId,
      {
        isShared: true,
        shareToken: token,
        shareExpiry: expiresAt || null
      }
    );

    // Log activity
    await logActivity(
      auth.userId, 
      resourceType === "file" ? "share" : "share_folder", 
      resourceId, 
      resource.name, 
      resourceType
    );

    const shareUrl = `${Deno.env.get("FRONTEND_URL")}/shared/${token}`;

    ctx.response.body = {
      success: true,
      data: {
        ...share,
        shareUrl
      }
    } as ApiResponse<ShareDocument & { shareUrl: string }>;
  } catch (error) {
    logger.error("Create share error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to create share link"
    };
  }
});

// Get shared resource by token
sharingRouter.get("/:token", async (ctx) => {
  try {
    const token = ctx.params.token!;

    // Find share by token
    const shareResponse = await databases.listDocuments(
      DATABASE_ID,
      SHARES_COLLECTION_ID,
      [Query.equal("token", token)]
    );

    if (shareResponse.documents.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: "Share not found"
      };
      return;
    }

    const share = shareResponse.documents[0] as ShareDocument;

    // Check if share has expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      ctx.response.status = 410;
      ctx.response.body = {
        success: false,
        error: "Share link has expired"
      };
      return;
    }

    // Get the shared resource
    const collectionId = share.resourceType === "file" ? FILES_COLLECTION_ID : FOLDERS_COLLECTION_ID;
    const resource = await databases.getDocument(DATABASE_ID, collectionId, share.resourceId);

    ctx.response.body = {
      success: true,
      data: {
        share,
        resource
      }
    } as ApiResponse;
  } catch (error) {
    logger.error("Get shared resource error:", error);
    ctx.response.status = 404;
    ctx.response.body = {
      success: false,
      error: "Shared resource not found"
    };
  }
});

// Get user's shares
sharingRouter.get("/", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const url = new URL(ctx.request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const response = await databases.listDocuments(
      DATABASE_ID,
      SHARES_COLLECTION_ID,
      [
        Query.equal("ownerId", auth.userId),
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc("$createdAt")
      ]
    );

    // Enhance shares with resource information
    const enhancedShares = await Promise.all(
      response.documents.map(async (share: ShareDocument) => {
        try {
          const collectionId = share.resourceType === "file" ? FILES_COLLECTION_ID : FOLDERS_COLLECTION_ID;
          const resource = await databases.getDocument(DATABASE_ID, collectionId, share.resourceId);
          return {
            ...share,
            resource,
            shareUrl: `${Deno.env.get("FRONTEND_URL")}/shared/${share.token}`
          };
        } catch (error) {
          logger.error("Error getting resource for share:", error);
          return share;
        }
      })
    );

    ctx.response.body = {
      success: true,
      data: {
        documents: enhancedShares,
        total: response.total,
        offset,
        limit
      }
    } as ApiResponse;
  } catch (error) {
    logger.error("Get shares error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get shares"
    };
  }
});

// Delete share
sharingRouter.delete("/:shareId", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const shareId = ctx.params.shareId!;

    // Get share document
    const share = await databases.getDocument(DATABASE_ID, SHARES_COLLECTION_ID, shareId);

    // Check ownership
    if (share.ownerId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Update resource to remove sharing
    const collectionId = share.resourceType === "file" ? FILES_COLLECTION_ID : FOLDERS_COLLECTION_ID;
    await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      share.resourceId,
      {
        isShared: false,
        shareToken: null,
        shareExpiry: null
      }
    );

    // Delete share document
    await databases.deleteDocument(DATABASE_ID, SHARES_COLLECTION_ID, shareId);

    ctx.response.body = {
      success: true,
      message: "Share deleted successfully"
    } as ApiResponse;
  } catch (error) {
    logger.error("Delete share error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to delete share"
    };
  }
});

// Update share permissions
sharingRouter.patch("/:shareId", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const shareId = ctx.params.shareId!;
    const body = await ctx.request.body().value;
    const { permissions, expiresAt, isPublic } = body;

    // Get share document
    const share = await databases.getDocument(DATABASE_ID, SHARES_COLLECTION_ID, shareId);

    // Check ownership
    if (share.ownerId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Update share
    const updatedShare = await databases.updateDocument(
      DATABASE_ID,
      SHARES_COLLECTION_ID,
      shareId,
      {
        ...(permissions && { permissions }),
        ...(expiresAt !== undefined && { expiresAt }),
        ...(isPublic !== undefined && { isPublic })
      }
    );

    ctx.response.body = {
      success: true,
      data: updatedShare
    } as ApiResponse<ShareDocument>;
  } catch (error) {
    logger.error("Update share error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to update share"
    };
  }
});