import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { databases } from "../main.ts";
import { requireAuth } from "../middleware/auth.ts";
import { logger } from "../utils/logger.ts";
import { FolderDocument, ApiResponse, PaginatedResponse } from "../types/index.ts";
import { Query, Permission, Role, ID } from "https://deno.land/x/appwrite@9.0.0/mod.ts";
import { logActivity } from "../utils/activity.ts";

export const foldersRouter = new Router({ prefix: "/api/folders" });

const DATABASE_ID = Deno.env.get("APPWRITE_DATABASE_ID")!;
const FOLDERS_COLLECTION_ID = "folders";

// Get folders
foldersRouter.get("/", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const url = new URL(ctx.request.url);
    const parentId = url.searchParams.get("parentId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const queries = [
      Query.equal("userId", auth.userId),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc("$createdAt")
    ];

    if (parentId) {
      queries.push(Query.equal("parentId", parentId));
    } else {
      queries.push(Query.isNull("parentId"));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      FOLDERS_COLLECTION_ID,
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
    } as ApiResponse<PaginatedResponse<FolderDocument>>;
  } catch (error) {
    logger.error("Get folders error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to retrieve folders"
    };
  }
});

// Get folder by ID
foldersRouter.get("/:folderId", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const folderId = ctx.params.folderId!;

    const folder = await databases.getDocument(
      DATABASE_ID,
      FOLDERS_COLLECTION_ID,
      folderId
    );

    // Check ownership
    if (folder.userId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    ctx.response.body = {
      success: true,
      data: folder
    } as ApiResponse<FolderDocument>;
  } catch (error) {
    logger.error("Get folder error:", error);
    ctx.response.status = 404;
    ctx.response.body = {
      success: false,
      error: "Folder not found"
    };
  }
});

// Create folder
foldersRouter.post("/", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const body = await ctx.request.body().value;
    const { name, parentId } = body;

    if (!name) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Folder name is required"
      };
      return;
    }

    // Build path
    let path = "/";
    if (parentId) {
      const parentFolder = await databases.getDocument(
        DATABASE_ID,
        FOLDERS_COLLECTION_ID,
        parentId
      );
      
      if (parentFolder.userId !== auth.userId) {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          error: "Access denied to parent folder"
        };
        return;
      }
      
      path = `${parentFolder.path}${parentFolder.name}/`;
    }

    // Create folder document
    const folder = await databases.createDocument(
      DATABASE_ID,
      FOLDERS_COLLECTION_ID,
      ID.unique(),
      {
        name,
        parentId: parentId || null,
        userId: auth.userId,
        path,
        isShared: false
      },
      [
        Permission.read(Role.user(auth.userId)),
        Permission.update(Role.user(auth.userId)),
        Permission.delete(Role.user(auth.userId))
      ]
    );

    // Log activity
    await logActivity(auth.userId, "create_folder", folder.$id, folder.name, "folder");

    ctx.response.body = {
      success: true,
      data: folder
    } as ApiResponse<FolderDocument>;
  } catch (error) {
    logger.error("Create folder error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to create folder"
    };
  }
});

// Delete folder
foldersRouter.delete("/:folderId", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const folderId = ctx.params.folderId!;

    // Get folder document
    const folder = await databases.getDocument(
      DATABASE_ID,
      FOLDERS_COLLECTION_ID,
      folderId
    );

    // Check ownership
    if (folder.userId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // TODO: Recursively delete all files and subfolders
    // This is a simplified version - in production, you'd want to handle this more carefully
    
    // Delete folder document
    await databases.deleteDocument(DATABASE_ID, FOLDERS_COLLECTION_ID, folderId);

    // Log activity
    await logActivity(auth.userId, "delete_folder", folder.$id, folder.name, "folder");

    ctx.response.body = {
      success: true,
      message: "Folder deleted successfully"
    } as ApiResponse;
  } catch (error) {
    logger.error("Delete folder error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to delete folder"
    };
  }
});

// Rename folder
foldersRouter.patch("/:folderId/rename", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const folderId = ctx.params.folderId!;
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

    // Get folder document
    const folder = await databases.getDocument(
      DATABASE_ID,
      FOLDERS_COLLECTION_ID,
      folderId
    );

    // Check ownership
    if (folder.userId !== auth.userId) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "Access denied"
      };
      return;
    }

    // Update document
    const updatedFolder = await databases.updateDocument(
      DATABASE_ID,
      FOLDERS_COLLECTION_ID,
      folderId,
      { name: newName }
    );

    // Log activity
    await logActivity(auth.userId, "rename_folder", folder.$id, `${folder.name} → ${newName}`, "folder");

    ctx.response.body = {
      success: true,
      data: updatedFolder
    } as ApiResponse<FolderDocument>;
  } catch (error) {
    logger.error("Rename folder error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to rename folder"
    };
  }
});

// Get folder path (breadcrumb)
foldersRouter.get("/:folderId/path", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const folderId = ctx.params.folderId!;

    const path = [];
    let currentFolderId: string | null = folderId;

    // Build path by traversing up the folder hierarchy
    while (currentFolderId) {
      const folder = await databases.getDocument(
        DATABASE_ID,
        FOLDERS_COLLECTION_ID,
        currentFolderId
      );

      // Check ownership
      if (folder.userId !== auth.userId) {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          error: "Access denied"
        };
        return;
      }

      path.unshift({
        $id: folder.$id,
        name: folder.name,
        path: folder.path
      });

      currentFolderId = folder.parentId;
    }

    // Add root folder
    path.unshift({
      $id: null,
      name: "Home",
      path: "/"
    });

    ctx.response.body = {
      success: true,
      data: path
    } as ApiResponse;
  } catch (error) {
    logger.error("Get folder path error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get folder path"
    };
  }
});