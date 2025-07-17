import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { databases } from "../main.ts";
import { requireAuth } from "../middleware/auth.ts";
import { logger } from "../utils/logger.ts";
import { FileDocument, FolderDocument, ApiResponse } from "../types/index.ts";
import { Query } from "https://deno.land/x/appwrite@9.0.0/mod.ts";

export const searchRouter = new Router({ prefix: "/api/search" });

const DATABASE_ID = Deno.env.get("APPWRITE_DATABASE_ID")!;
const FILES_COLLECTION_ID = "files";
const FOLDERS_COLLECTION_ID = "folders";

// Search files and folders
searchRouter.get("/", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const url = new URL(ctx.request.url);
    const query = url.searchParams.get("q");
    const type = url.searchParams.get("type"); // "files", "folders", or "all"
    const limit = parseInt(url.searchParams.get("limit") || "20");

    if (!query) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Search query is required"
      };
      return;
    }

    const results: {
      files: FileDocument[];
      folders: FolderDocument[];
    } = {
      files: [],
      folders: []
    };

    // Search files
    if (type === "files" || type === "all" || !type) {
      try {
        const fileResponse = await databases.listDocuments(
          DATABASE_ID,
          FILES_COLLECTION_ID,
          [
            Query.equal("userId", auth.userId),
            Query.search("name", query),
            Query.limit(limit),
            Query.orderDesc("$createdAt")
          ]
        );
        results.files = fileResponse.documents as FileDocument[];
      } catch (error) {
        logger.error("File search error:", error);
      }
    }

    // Search folders
    if (type === "folders" || type === "all" || !type) {
      try {
        const folderResponse = await databases.listDocuments(
          DATABASE_ID,
          FOLDERS_COLLECTION_ID,
          [
            Query.equal("userId", auth.userId),
            Query.search("name", query),
            Query.limit(limit),
            Query.orderDesc("$createdAt")
          ]
        );
        results.folders = folderResponse.documents as FolderDocument[];
      } catch (error) {
        logger.error("Folder search error:", error);
      }
    }

    ctx.response.body = {
      success: true,
      data: results
    } as ApiResponse<typeof results>;
  } catch (error) {
    logger.error("Search error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Search failed"
    };
  }
});

// Advanced search with filters
searchRouter.post("/advanced", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const body = await ctx.request.body().value;
    const { 
      query, 
      fileTypes, 
      sizeMin, 
      sizeMax, 
      dateFrom, 
      dateTo, 
      folderId,
      tags,
      limit = 20 
    } = body;

    const queries = [
      Query.equal("userId", auth.userId),
      Query.limit(limit),
      Query.orderDesc("$createdAt")
    ];

    // Add search query
    if (query) {
      queries.push(Query.search("name", query));
    }

    // Add folder filter
    if (folderId) {
      queries.push(Query.equal("folderId", folderId));
    }

    // Add file type filter
    if (fileTypes && fileTypes.length > 0) {
      queries.push(Query.contains("mimeType", fileTypes));
    }

    // Add size filters
    if (sizeMin) {
      queries.push(Query.greaterThanEqual("size", sizeMin));
    }
    if (sizeMax) {
      queries.push(Query.lessThanEqual("size", sizeMax));
    }

    // Add date filters
    if (dateFrom) {
      queries.push(Query.greaterThanEqual("$createdAt", dateFrom));
    }
    if (dateTo) {
      queries.push(Query.lessThanEqual("$createdAt", dateTo));
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      queries.push(Query.contains("tags", tags));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      queries
    );

    ctx.response.body = {
      success: true,
      data: {
        files: response.documents,
        total: response.total
      }
    } as ApiResponse;
  } catch (error) {
    logger.error("Advanced search error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Advanced search failed"
    };
  }
});

// Get recent files
searchRouter.get("/recent", async (ctx) => {
  try {
    const auth = requireAuth(ctx);
    const url = new URL(ctx.request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const response = await databases.listDocuments(
      DATABASE_ID,
      FILES_COLLECTION_ID,
      [
        Query.equal("userId", auth.userId),
        Query.limit(limit),
        Query.orderDesc("$createdAt")
      ]
    );

    ctx.response.body = {
      success: true,
      data: response.documents
    } as ApiResponse<FileDocument[]>;
  } catch (error) {
    logger.error("Get recent files error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to get recent files"
    };
  }
});