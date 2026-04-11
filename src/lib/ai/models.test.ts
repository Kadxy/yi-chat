import { beforeAll, describe, expect, it, vi } from "vitest";
import { ANTHROPIC_FILE_MIME_TYPES } from "./file-support";

vi.mock("server-only", () => ({}));

let modelsModule: typeof import("./models");

beforeAll(async () => {
  modelsModule = await import("./models");
});

describe("customModelProvider file support metadata", () => {
  it("adds rich support for anthropic sonnet-4.5", () => {
    const { customModelProvider, getFilePartSupportedMimeTypes } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "anthropic",
      model: "sonnet-4.5",
    });
    expect(getFilePartSupportedMimeTypes(model)).toEqual(
      Array.from(ANTHROPIC_FILE_MIME_TYPES),
    );
  });

  it("returns fallback model when provider is unknown", () => {
    const { customModelProvider } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "unknown",
      model: "test",
    });
    const fallback = customModelProvider.getModel(undefined);
    expect(model).toBe(fallback);
  });

  it("only has anthropic provider", () => {
    const { customModelProvider } = modelsModule;
    expect(customModelProvider.modelsInfo).toHaveLength(1);
    expect(customModelProvider.modelsInfo[0].provider).toBe("anthropic");
  });
});
