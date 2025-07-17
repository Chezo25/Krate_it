import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { account, users } from "../main.ts";
import { logger } from "../utils/logger.ts";
import { ApiResponse } from "../types/index.ts";

export const authRouter = new Router({ prefix: "/api/auth" });

// Register new user
authRouter.post("/register", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { email, password, name } = body;

    if (!email || !password || !name) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: "Email, password, and name are required" 
      };
      return;
    }

    // Create user account
    const user = await account.create("unique()", email, password, name);
    
    // Create session
    const session = await account.createEmailSession(email, password);
    
    logger.info(`User registered: ${user.$id}`);
    
    ctx.response.body = {
      success: true,
      data: {
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
          $createdAt: user.$createdAt
        },
        session: {
          $id: session.$id,
          expire: session.expire
        }
      }
    } as ApiResponse;
  } catch (error) {
    logger.error("Registration error:", error);
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: error.message || "Registration failed"
    };
  }
});

// Login user
authRouter.post("/login", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { email, password } = body;

    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: "Email and password are required" 
      };
      return;
    }

    // Create session
    const session = await account.createEmailSession(email, password);
    
    // Get user details
    const user = await account.get();
    
    logger.info(`User logged in: ${user.$id}`);
    
    ctx.response.body = {
      success: true,
      data: {
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
          $createdAt: user.$createdAt
        },
        session: {
          $id: session.$id,
          expire: session.expire
        }
      }
    } as ApiResponse;
  } catch (error) {
    logger.error("Login error:", error);
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Invalid credentials"
    };
  }
});

// Logout user
authRouter.post("/logout", async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const sessionId = authHeader.substring(7);
      await account.deleteSession(sessionId);
    }
    
    ctx.response.body = {
      success: true,
      message: "Logged out successfully"
    } as ApiResponse;
  } catch (error) {
    logger.error("Logout error:", error);
    ctx.response.body = {
      success: true,
      message: "Logged out successfully"
    };
  }
});

// Get current user
authRouter.get("/me", async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { 
        success: false, 
        error: "Authentication required" 
      };
      return;
    }

    const sessionId = authHeader.substring(7);
    
    // Verify session
    const session = await account.getSession(sessionId);
    const user = await users.get(session.userId);
    
    ctx.response.body = {
      success: true,
      data: {
        $id: user.$id,
        email: user.email,
        name: user.name,
        $createdAt: user.$createdAt
      }
    } as ApiResponse;
  } catch (error) {
    logger.error("Get user error:", error);
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      error: "Authentication failed"
    };
  }
});

// Password reset request
authRouter.post("/password-reset", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { email } = body;

    if (!email) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: "Email is required" 
      };
      return;
    }

    const resetUrl = `${Deno.env.get("FRONTEND_URL")}/reset-password`;
    await account.createRecovery(email, resetUrl);
    
    ctx.response.body = {
      success: true,
      message: "Password reset email sent"
    } as ApiResponse;
  } catch (error) {
    logger.error("Password reset error:", error);
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Failed to send password reset email"
    };
  }
});

// Complete password reset
authRouter.post("/password-reset/confirm", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { userId, secret, password } = body;

    if (!userId || !secret || !password) {
      ctx.response.status = 400;
      ctx.response.body = { 
        success: false, 
        error: "User ID, secret, and new password are required" 
      };
      return;
    }

    await account.updateRecovery(userId, secret, password, password);
    
    ctx.response.body = {
      success: true,
      message: "Password reset successfully"
    } as ApiResponse;
  } catch (error) {
    logger.error("Password reset confirm error:", error);
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Failed to reset password"
    };
  }
});