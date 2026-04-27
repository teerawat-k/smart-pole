import { Elysia } from "elysia";
import { captchaService } from "./captcha.service";

export const captchaController = new Elysia({ prefix: "/api/captcha" }).get("/new", async () => {
  const data = await captchaService.create();
  return { success: true, data };
});
