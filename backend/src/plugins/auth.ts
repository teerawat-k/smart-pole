import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { env } from "@/config/env";
import { ForbiddenError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

// Atom plugin: validate JWT, derive userId/role — ห้ามใส่ business logic
export const authPlugin = new Elysia({ name: "auth-plugin" })
  .use(jwt({ name: "jwt", secret: env.JWT_SECRET }))
  .use(bearer())
  .derive({ as: "scoped" }, async ({ jwt, bearer }) => {
    if (!bearer) throw new ForbiddenError(ErrorCode.AUTH_FORBIDDEN, "ไม่ได้รับอนุญาต");
    const payload = await jwt.verify(bearer);
    if (!payload || typeof payload === "boolean") throw new ForbiddenError(ErrorCode.AUTH_TOKEN_EXPIRED, "Token หมดอายุ");
    return { userId: Number(payload.sub), role: String(payload.role ?? "") };
  });
