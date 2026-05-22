import type { IncomingMessage, ServerResponse } from "http";
import { getVercelHandler } from "../backend/src/vercel";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  restoreApiPath(request);
  const nestHandler = await getVercelHandler();

  nestHandler(request, response);
}

function restoreApiPath(request: IncomingMessage) {
  const url = new URL(request.url ?? "/api/server", "http://vercel.local");
  const path = url.searchParams.get("path");

  url.searchParams.delete("path");
  const search = url.searchParams.toString();
  request.url = `/api/${path ?? ""}${search ? `?${search}` : ""}`;
}
