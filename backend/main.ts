import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { Client, Account, Storage, Databases, Users, Permission, Role } from "https://deno.land/x/appwrite@9.0.0/mod.ts";
import { authRouter } from "./routes/auth.ts";
import { filesRouter } from "./routes/files.ts";
import { foldersRouter } from "./routes/folders.ts";
import { searchRouter } from "./routes/search.ts";
import { sharingRouter } from "./routes/sharing.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { logger } from "./utils/logger.ts";

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(Deno.env.get("APPWRITE_ENDPOINT") || "")
  .setProject(Deno.env.get("APPWRITE_PROJECT_ID") || "")
  .setKey(Deno.env.get("APPWRITE_API_KEY") || "");

export const account = new Account(client);
export const storage = new Storage(client);
export const databases = new Databases(client);
export const users = new Users(client);

const app = new Application();
const router = new Router();

// CORS configuration
app.use(oakCors({
  origin: [
    "http://localhost:3000",
    "http://localhost:4321",
    Deno.env.get("FRONTEND_URL") || ""
  ].filter(Boolean),
  credentials: true,
}));

// Global middleware
app.use(errorHandler);
app.use(async (ctx, next) => {
  logger.info(`${ctx.request.method} ${ctx.request.url.pathname}`);
  await next();
});

// Health check endpoint
router.get("/health", (ctx) => {
  ctx.response.body = { status: "healthy", timestamp: new Date().toISOString() };
});

// API routes
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// Protected routes (require authentication)
app.use(authMiddleware);
app.use(filesRouter.routes());
app.use(filesRouter.allowedMethods());
app.use(foldersRouter.routes());
app.use(foldersRouter.allowedMethods());
app.use(searchRouter.routes());
app.use(searchRouter.allowedMethods());
app.use(sharingRouter.routes());
app.use(sharingRouter.allowedMethods());

// Start server
const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🚀 Server running on http://localhost:${port}`);
await app.listen({ port });