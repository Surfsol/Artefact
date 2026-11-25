import { createCaller as createCallerFactory } from "@/server/router";

// Server Components call the router in-process. The browser uses /api/trpc.
export function createCaller() {
  return createCallerFactory({});
}
