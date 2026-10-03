import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adviseNc } from "./nc-advisor.server";

export const getNcAdvice = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ description: z.string().trim().min(10).max(4000) }).parse(d))
  .handler(async ({ data }) => adviseNc(data.description));
