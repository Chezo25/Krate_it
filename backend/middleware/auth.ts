import { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { account, users } from "../main.ts";
import { AppwriteContext } from "../types/index.ts";
import { logger } from "../utils/logger.ts";

export async function authMiddleware(ctx: Context, next: Next) {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Missing or invalid authorization header" };
      return;
    }

    const sessionId = authHeader.substring(7);
    
    // Verify session with Appwrite
    const session = await account.getSession(sessionId);
    
    if (!session) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid session" };
      return;
    }

    // Get user details
    const user = await users.get(session.userId);
    
    // Add user context to state
    ctx.state.auth = {
      userId: session.userId,
      sessionId: sessionId,
      user: user
    } as AppwriteContext;

    await next();
  } catch (error) {
    logger.error("Authentication error:", error);
    ctx.response.status = 401;
    ctx.response.body = { error: "Authentication failed" };
  }
}

export function requireAuth(ctx: Context): AppwriteContext {
  const auth = ctx.state.auth as AppwriteContext;
  if (!auth) {
    throw new Error("Authentication required");
  }
  return auth;
}