import { applyTestEnv } from "./test-env";

// Runs in every test worker before the test file (and AppModule) loads.
applyTestEnv();
