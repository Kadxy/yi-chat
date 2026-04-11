import { MemoryCache } from "./memory-cache";

import { Cache } from "./cache.interface";
import { IS_DEV } from "lib/const";

declare global {
  // eslint-disable-next-line no-var
  var __server__cache__: Cache | undefined;
}

const serverCache = globalThis.__server__cache__ || new MemoryCache();

if (IS_DEV) {
  globalThis.__server__cache__ = serverCache;
}

export { serverCache };
