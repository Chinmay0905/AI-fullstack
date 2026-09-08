import { serverEnv } from "./config/serverEnv";
import { connectDb } from "./db/connect";
import { createApp } from "./app";

async function main(): Promise<void> {
  await connectDb();
  const app = createApp();
  app.listen(serverEnv.PORT, () => {
    console.log(`[server] listening on port ${serverEnv.PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error:", err);
  process.exit(1);
});
