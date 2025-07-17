import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { storage, databases } from "../main.ts";
import { requireAuth } from "../middleware/auth.ts";
import { logger } from "../utils/logger.ts";
import { FileDocument, ApiResponse, PaginatedResponse } from "../types/index.ts";
import { Query, Permission, Role, ID } from "https://deno.land/x/appwrite@9.0.0/mod.ts";
import { logActivity } from "../utils/activity.ts";

export const filesRouter = new Router({ prefix: "/api/files" });

const DATABASE_ID = Deno.env.get("APPWRITE_DATABASE_ID")!;
const STORAGE_BUCKET_ID = Deno.env.get("APPWRITE_STORAGE_BUCKET_ID")!;
const FILES_COLLECTION_ID = "files";

// Get files in a folder
filesRouter.get("/", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const url = new URL(ctx.request.url);
    const folderId = url.searchParams.get("folderId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const queries = [
      Query.equal("userId", auth.userId),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc("$createdAt")
    ];

    if (folderId) {
      queries.push(Query.equal("folderId", folderId));
    } else {
      queries.push(Query.isNull("folderId"));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      queries
    );

    ctx.response.body = {
      success: true,
      data: {
        documents: response.documents,
        total: response.total,
        offset,
        limit
      }
    } as ApiResponse<PaginatedResponse<FileDocument>>;
  } catch (error) {
    logger.error("Get files error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to retrieve files"
    };
  }
});

// Get file by ID
filesRouter.get("/:fileId", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const fileId = ctx.params.fileId!;

    const file = await databases.getDocument(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      fileId
    );

    // Check ownership
    if (file.userId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    ctx.response.body = {
      success: true,
      data: file
    } as ApiResponse<FileDocument>;
  } catch (error) {
    logger.error("Get file error:", error);
    ctx.response.status = 404;
    ctx.response.body = {
      success: false,
      error: "File not found"
    };
  }
});

// Upload file
filesRouter.post("/upload", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const body = await ctx.request.body({ type: "form-data" }).value;
    const formData = await body.read();

    const file = formData.files?.find(f => f.name === "file");
    const folderId = formData.fields?.folderId;
    const path = formData.fields?.path || "/";

    if (!file) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "No file provided"
      };
      return;
    }

    // Upload to Appwrite Storage
    const storageFile = await storage.createFile(
      STORAGE_BUCKET_ID,
      ID.unique(),
      file,
      [
        Permission.read(Role.user(auth.userId)),
        Permission.update(Role.user(auth.userId)),
        Permission.delete(Role.user(auth.userId))
      ]
    );

    // Create file document in database
    const fileDoc = await databases.createDocument(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      ID.unique(),
      {
        name: file.originalName || file.name,
        originalName: file.originalName || file.name,
        size: file.size,
        mimeType: file.type,
        storageId: storageFile.$id,
        folderId: folderId || null,
        userId: auth.userId,
        path,
        isShared: false,
        tags: []
      },
      [
        Permission.read(Role.user(auth.userId)),
        Permission.update(Role.user(auth.userId)),
        Permission.delete(Role.user(auth.userId))
      ]
    );

    // Log activity
    await logActivity(auth.userId, "upload", fileDoc.$id, fileDoc.name, "file");

    ctx.response.body = {
      success: true,
      data: fileDoc
    } as ApiResponse<FileDocument>;
  } catch (error) {
    logger.error("Upload file error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to upload file"
    };
  }
});

// Download file
filesRouter.get("/:fileId/download", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const fileId = ctx.params.fileId!;

    // Get file document
    const fileDoc = await databases.getDocument(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      fileId
    );

    // Check ownership or sharing permissions
    if (fileDoc.userId !== auth.userId && !fileDoc.isShared) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Get download URL from storage
    const downloadUrl = await storage.getFileDownload(
      STORAGE_BUCKET_ID,
      fileDoc.storageId
    );

    // Log activity
    await logActivity(auth.userId, "download", fileDoc.$id, fileDoc.name, "file");

    ctx.response.body = {
      success: true,
      data: { downloadUrl }
    } as ApiResponse<{ downloadUrl: string }>;
  } catch (error) {
    logger.error("Download file error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get download URL"
    };
  }
});

// Delete file
filesRouter.delete("/:fileId", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const fileId = ctx.params.fileId!;

    // Get file document
    const fileDoc = await databases.getDocument(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      fileId
    );

    // Check ownership
    if (fileDoc.userId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Delete from storage
    await storage.deleteFile(STORAGE_BUCKET_ID, fileDoc.storageId);

    // Delete document
    await databases.deleteDocument(DATABASE_ID, FILES_COLLECTION_ID, fileId);

    // Log activity
    await logActivity(auth.userId, "delete", fileDoc.$id, fileDoc.name, "file");

    ctx.response.body = {
      success: true,
      message: "File deleted successfully"
    } as ApiResponse;
  } catch (error) {
    logger.error("Delete file error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to delete file"
    };
  }
});

// Rename file
filesRouter.patch("/:fileId/rename", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const fileId = ctx.params.fileId!;
    const body = await ctx.request.body().value;
    const { newName } = body;

    if (!newName) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "New name is required"
      };
      return;
    }

    // Get file document
    const fileDoc = await databases.getDocument(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      fileId
    );

    // Check ownership
    if (fileDoc.userId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Update document
    const updatedFile = await databases.updateDocument(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      fileId,
      { name: newName }
    );

    // Log activity
    await logActivity(auth.userId, "rename", fileDoc.$id, `${fileDoc.name} → ${newName}`, "file");

    ctx.response.body = {
      success: true,
      data: updatedFile
    } as ApiResponse<FileDocument>;
  } catch (error) {
    logger.error("Rename file error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to rename file"
    };
  }
});

// Get file preview
filesRouter.get("/:fileId/preview", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const fileId = ctx.params.fileId!;
    const url = new URL(ctx.request.url);
    const width = parseInt(url.searchParams.get("width") || "400");
    const height = parseInt(url.searchParams.get("height") || "400");

    // Get file document
    const fileDoc = await databases.getDocument(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      fileId
    );

    // Check ownership or sharing permissions
    if (fileDoc.userId !== auth.userId && !fileDoc.isShared) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Get preview URL from storage
    const previewUrl = await storage.getFilePreview(
      STORAGE_BUCKET_ID,
      fileDoc.storageId,
      width,
      height
    );

    ctx.response.body = {
      success: true,
      data: { previewUrl }
    } as ApiResponse<{ previewUrl: string }>;
  } catch (error) {
    logger.error("Get file preview error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get file preview"
    };
  }
});