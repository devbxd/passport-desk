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
  surnameAr: z.string(),
  givenNamesAr: z.string(),
  fatherNameAr: z.string(),
  motherNameAr: z.string(),
  placeOfBirthAr: z.string(),
  nationalityAr: z.string(),
  professionAr: z.string(),
  addressAr: z.string(),
  issuingAuthorityAr: z.string(),
  otherArabic: z.string(),
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
- "notes" holds a short warning if the image is blurry, cropped, or a field was guessed. Otherwise empty string.

Arabic text — many documents print information in Arabic script as well as (or instead of) Latin script:
- Fill the fields ending in "Ar" with the Arabic text EXACTLY as printed, in Arabic script. Never transliterate, translate or romanize it, and never put Latin text in these fields.
- "surnameAr" / "givenNamesAr": the holder's family name and given name(s) in Arabic.
- "fatherNameAr" / "motherNameAr": the father's and mother's names in Arabic, when printed.
- "placeOfBirthAr", "nationalityAr", "professionAr", "addressAr", "issuingAuthorityAr": the matching values printed in Arabic.
- "otherArabic": any other Arabic text on the data page that does not fit the fields above (e.g. spouse's name, remarks), one item per line written as "<printed Arabic label>: <value>". Ignore pre-printed headings such as the country name or the word "passport".
- The Latin fields (surname, givenNames, placeOfBirth, ...) keep their Latin-script values as printed. If a value is printed only in Arabic, leave the Latin field empty rather than transliterating.
- If the document has no Arabic text, return empty strings for all Arabic fields.`;

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

    // Checked before spending a scan so a misconfigured deployment never
    // eats anyone's monthly quota.
    const apiKey = env("OPENAI_API_KEY");
    if (!apiKey) {
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: "Scanning is not configured (missing OPENAI_API_KEY).",
      });
    }

    await ctx.runMutation(internal.scanUsage.consumeScan, {
      ownerTokenIdentifier: identity.tokenIdentifier,
    });
    const refund = () =>
      ctx.runMutation(internal.scanUsage.refundScan, {
        ownerTokenIdentifier: identity.tokenIdentifier,
      });

    const imageUrl = await ctx.runQuery(internal.passports.getImageUrl, {
      storageId,
      ownerTokenIdentifier: identity.tokenIdentifier,
    });
    if (!imageUrl) {
      await refund();
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Uploaded image could not be found",
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
      // "Could not read this document" stays charged (the AI did run, and
      // refunding it would let bad uploads cost us for free). Provider and
      // network failures are our fault, so the scan is given back.
      if (error instanceof ConvexError) throw error;
      await refund();
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
