import "server-only";
import { IS_DEV } from "lib/const";
import type { FileStorage } from "./file-storage.interface";
import { createS3FileStorage } from "./s3-file-storage";
import logger from "logger";

declare global {
  // eslint-disable-next-line no-var
  var __server__file_storage__: FileStorage | undefined;
}

const createFileStorage = (): FileStorage => {
  logger.info("Creating file storage: s3");
  return createS3FileStorage();
};

let _storage: FileStorage | undefined = globalThis.__server__file_storage__;

export const getFileStorage = (): FileStorage => {
  if (!_storage) {
    _storage = createFileStorage();
    if (IS_DEV) {
      globalThis.__server__file_storage__ = _storage;
    }
  }
  return _storage;
};
