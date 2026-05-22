import { createApplication } from "./platform";

async function bootstrap() {
  const app = await createApplication();
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;

  await app.listen(port);
}

void bootstrap();
