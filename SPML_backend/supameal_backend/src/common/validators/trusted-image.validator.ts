import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Images shown to other users must come from our own storage. Accepting any
 * https URL let an owner hotlink third-party content or a tracking pixel that
 * logs the IP address of every visitor who opens their restaurant page.
 *
 * Allowed:
 *  - local uploads served by this API: /uploads/[<userId>_]<uuid>.<jpg|png|webp>
 *  - this deployment's Cloudinary account: https://res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/image/upload/...
 * Optional extras per field: a short emoji/text placeholder (menu items),
 * inline data:image URLs (legacy profile photos) and Google profile avatars.
 */
const LOCAL_UPLOAD =
  /^\/uploads\/(?:[a-f0-9]{24}_)?[a-f0-9-]{36}\.(?:jpg|png|webp)$/i;
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const GOOGLE_AVATAR = /^https:\/\/lh\d\.googleusercontent\.com\/[^\s"'<>\\]+$/;
const UNSAFE_CHARS = /[\s"'<>\\()]/;

export interface TrustedImageOptions {
  /** Short non-URL text such as an emoji (menu items without a photo). */
  allowEmoji?: boolean;
  /** Inline base64 PNG/JPEG/WebP (older profile photos were stored this way). */
  allowDataImage?: boolean;
  /** Google account avatars (set when a user signs in with Google). */
  allowGoogleAvatar?: boolean;
}

function isEmojiPlaceholder(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 16 &&
    !/[:/\\<>"'`]/.test(value) &&
    !/^\s|\s$/.test(value)
  );
}

export function isTrustedImageRef(
  value: unknown,
  options: TrustedImageOptions = {},
): boolean {
  if (typeof value !== 'string') return false;
  if (options.allowDataImage && DATA_IMAGE.test(value)) return true;
  if (value.length > 2048) return false;
  if (LOCAL_UPLOAD.test(value)) return true;

  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (cloud) {
    const prefix = `https://res.cloudinary.com/${cloud}/image/upload/`;
    if (
      value.startsWith(prefix) &&
      value.length > prefix.length &&
      !UNSAFE_CHARS.test(value)
    ) {
      return true;
    }
  }

  if (options.allowGoogleAvatar && GOOGLE_AVATAR.test(value)) return true;
  if (options.allowEmoji && isEmojiPlaceholder(value)) return true;
  return false;
}

export function IsTrustedImageRef(
  options: TrustedImageOptions = {},
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTrustedImageRef',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be an image uploaded to SupaMeal`,
        ...validationOptions,
      },
      validator: {
        validate: (value: unknown) => isTrustedImageRef(value, options),
      },
    });
  };
}
