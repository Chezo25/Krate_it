import { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { logger } from "../utils/logger.ts";

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    logger.error("Unhandled error:", error);
    
    // Determine error type and status code
    let status = 500;
    let message = "Internal server error";
    
    if (error.message.includes("not found")) {
      status = 404;
      message = "Resource not found";
    } else if (error.message.includes("unauthorized") || error.message.includes("permission")) {
      status = 403;
      message = "Access denied";
    } else if (error.message.includes("validation") || error.message.includes("invalid")) {
      status = 400;
      message = error.message;
    }
    
    ctx.response.status = status;
    ctx.response.body = {
      success: false,
      error: message,
      ...(Deno.env.get("LOG_LEVEL") === "debug" && { stack: error.stack })
    };
  }
}