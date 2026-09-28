"use node";

import { ConvexError, v } from "convex/values";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import * as z from "zod";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const PassportData = z.object({
  documentType: z.string(),
  surname: z.string(),
  givenNames: z.string(),
  passportNumber: z.string(),
  nationality: z.string(),
  issuingCountry: z.string(),
  dateOfBirth: z.string(),
  sex: z.string(),
  placeOfBirth: z.string(),
  dateOfIssue: z.string(),
  dateOfExpiry: z.string(),
  personalNumber: z.string(),
  mrz: z.string(),
  confidence: z.number(),
  notes: z.string(),
});

export type PassportExtraction = z.infer<typeof PassportData>;

// Read deployment env vars without depending on Node type definitions,
// which are not part of the frontend TypeScript project.
function env(name: string): string | undefined {
  const runtime = globalThis as unknown as {
    process?: { env: Record<string, string | undefined> };
  };
  return runtime.process?.env[name];
}

const SYSTEM_PROMPT = `You are an expert passport and travel document data extraction engine (OCR + MRZ parser).

Extract every field from the passport image. Rules:
- Read the two-line Machine Readable Zone (MRZ) at the bottom when present and use it to verify names, document number, nationality, dates and sex. Return the raw MRZ lines joined with a newline in "mrz".
- Dates MUST be returned in YYYY-MM-DD format. Resolve MRZ two-digit years sensibly (expiry/issue in the future or recent past, birth dates in the past).
- "sex" must be "M", "F" or "X".
- "nationality" and "issuingCountry" should be the full country name in English.
- "documentType" is e.g. "Passport", "ID Card".
- Use UPPERCASE for surname and givenNames, exactly as printed.
- If a field is genuinely not present or unreadable, return an empty string. Never invent data.
- "confidence" is your overall confidence from 0 to 100.
- "notes" holds a short warning if the image is blurry, cropped, or a field was guessed. Otherwise empty string.`;

export const extract = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }): Promise<PassportExtraction> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Please sign in to continue",
      });
    }

    await ctx.runMutation(internal.scanUsage.consumeScan, {
      ownerTokenIdentifier: identity.tokenIdentifier,
    });

    const imageUrl = await ctx.runQuery(internal.passports.getImageUrl, {
      storageId,
      ownerTokenIdentifier: identity.tokenIdentifier,
    });
    if (!imageUrl) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Uploaded image could not be found",
      });
    }

    const apiKey = env("OPENAI_API_KEY");
    if (!apiKey) {
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: "Scanning is not configured (missing OPENAI_API_KEY).",
      });
    }
    // Any OpenAI-compatible service works (OpenAI, Gemini's compatibility
    // endpoint, ...) — set OPENAI_BASE_URL to switch providers.
    const openai = new OpenAI({
      apiKey,
      baseURL: env("OPENAI_BASE_URL"),
      maxRetries: 4,
    });

    try {
      const response = await openai.chat.completions.parse({
        model: env("OPENAI_MODEL") ?? "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all passport data from this document image.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: zodResponseFormat(PassportData, "passport"),
      });

      const parsed = response.choices[0]?.message?.parsed;
      if (!parsed) {
        throw new ConvexError({
          code: "EXTERNAL_SERVICE_ERROR",
          message: "Could not read this document. Try a clearer photo.",
        });
      }
      return parsed;
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      if (error instanceof OpenAI.APIError) {
        throw new ConvexError({
          code: "EXTERNAL_SERVICE_ERROR",
          message: `Scanning failed: ${error.message}`,
        });
      }
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: "Scanning failed. Please try again.",
      });
    }
  },
});
