import { z } from "zod";

// Shared by client (UX) and server (authority). Server Actions always re-validate.

export const LIMITS = {
  title: 100,
  recipientName: 60,
  welcomeMessage: 1000,
  authorName: 60,
  body: 1000,
  photoMaxBytes: 10 * 1024 * 1024,
  photoMaxSide: 2000,
  photoDimensionMax: 10000,
} as const;

// nanoid(21), URL-safe alphabet.
export const BOARD_SLUG_RE = /^[A-Za-z0-9_-]{21}$/;
// 32 random bytes as base64url, no padding.
export const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;

export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/** Counts Unicode code points, matching Postgres `char_length`. */
export function charLength(value: string): number {
  return [...value].length;
}

export function isBoardSlug(value: unknown): value is string {
  return typeof value === "string" && BOARD_SLUG_RE.test(value);
}

export function isSecret(value: unknown): value is string {
  return typeof value === "string" && SECRET_RE.test(value);
}

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .refine((v) => charLength(v) <= max, `${label} admite hasta ${max} caracteres`);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => charLength(v) <= max, `${label} admite hasta ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null);

export const boardSlugSchema = z.string().regex(BOARD_SLUG_RE);
export const secretSchema = z.string().regex(SECRET_RE);

export const createBoardSchema = z.object({
  title: requiredText(LIMITS.title, "El título"),
  recipientName: requiredText(LIMITS.recipientName, "El nombre del homenajeado"),
  welcomeMessage: optionalText(LIMITS.welcomeMessage, "El mensaje de bienvenida"),
  password: z.string().max(200).optional(),
});
export type CreateBoardInput = z.input<typeof createBoardSchema>;

export const photoSchema = z.object({
  messageId: z.uuid(),
  width: z.int().min(1).max(LIMITS.photoDimensionMax),
  height: z.int().min(1).max(LIMITS.photoDimensionMax),
});
export type PhotoInput = z.infer<typeof photoSchema>;

const messageContent = {
  authorName: requiredText(LIMITS.authorName, "El nombre"),
  body: optionalText(LIMITS.body, "El mensaje"),
};

export const createMessageSchema = z
  .object({
    boardSlug: boardSlugSchema,
    ...messageContent,
    photo: photoSchema.nullish().transform((v) => v ?? null),
  })
  .refine((m) => m.body !== null || m.photo !== null, {
    message: "Escribí un mensaje o agregá una foto",
    path: ["body"],
  });
export type CreateMessageInput = z.input<typeof createMessageSchema>;

export const updateMessageSchema = z.object({
  boardSlug: boardSlugSchema,
  messageId: z.uuid(),
  editToken: secretSchema,
  ...messageContent,
  removePhoto: z.boolean().default(false),
});
export type UpdateMessageInput = z.input<typeof updateMessageSchema>;

export const deleteMessageSchema = z.object({
  boardSlug: boardSlugSchema,
  messageId: z.uuid(),
  editToken: secretSchema,
});

export const adminRefSchema = z.object({
  boardSlug: boardSlugSchema,
  adminKey: secretSchema,
});

export const moderateMessageSchema = adminRefSchema.extend({
  messageId: z.uuid(),
  action: z.enum(["hide", "restore", "delete"]),
});

export const setBoardStatusSchema = adminRefSchema.extend({
  status: z.enum(["open", "closed"]),
});

/** First human-readable error from a zod failure. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}
