import { JSONSchema7 } from "json-schema";
import { z } from "zod";

export const envBooleanSchema = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      const lowerVal = val.toLowerCase();
      return lowerVal === "true" || lowerVal === "1" || lowerVal === "y";
    }
    return false;
  });

export type ObjectJsonSchema7 = {
  type: "object";
  required?: string[];
  description?: string;
  properties: {
    [key: string]: JSONSchema7;
  };
};
