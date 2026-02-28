import app from "./src/app.js";
import { assertEnv, env } from "./src/config/env.js";

assertEnv();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`FundForge API running on http://localhost:${env.port}`);
});
