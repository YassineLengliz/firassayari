import type { RequestListener } from "http";
import { createApplication } from "./platform";

let handler: Promise<RequestListener> | undefined;

export function getVercelHandler(): Promise<RequestListener> {
  handler ??= createApplication().then(async (app) => {
    await app.init();
    return app.getHttpAdapter().getInstance() as RequestListener;
  });

  return handler;
}
