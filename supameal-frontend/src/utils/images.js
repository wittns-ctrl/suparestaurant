// Delivery-time image optimisation for photos hosted on Cloudinary.
//
// Restaurant, gallery and menu photos are uploaded by owners and stored at their
// original size (often 3000px+ and several MB). Cloudinary can resize and
// re-encode on the fly: `f_auto` serves WebP/AVIF to browsers that support it,
// `q_auto` picks a visually lossless quality and `w_N,c_limit` caps the width
// without ever upscaling. Only Cloudinary URLs are rewritten; everything else
// (bundled images, /uploads paths, data URLs, other hosts) passes through.
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

// A first path segment made only of `x_value` parameters means a transformation
// is already in the URL (don't stack a second one on top).
const HAS_TRANSFORMATION = /^[a-z]{1,3}_[^/,]+(,[a-z]{1,3}_[^/,]+)*\//i;

// Fixed width steps so the same few variants are requested by everyone and stay
// warm in Cloudinary's CDN cache, instead of one variant per screen size.
const WIDTH_STEPS = [320, 480, 640, 960, 1280, 1600];

export function nearestWidth(width) {
  const wanted = Number(width) || WIDTH_STEPS[2];
  return WIDTH_STEPS.find((step) => step >= wanted) ?? WIDTH_STEPS[WIDTH_STEPS.length - 1];
}

export function isCloudinaryUrl(url) {
  return typeof url === 'string' && CLOUDINARY_UPLOAD.test(url);
}

export function optimizeImageUrl(url, width = 640) {
  if (!isCloudinaryUrl(url)) return url;
  const [, prefix, rest] = url.match(CLOUDINARY_UPLOAD);
  if (HAS_TRANSFORMATION.test(rest)) return url;
  return `${prefix}f_auto,q_auto,w_${nearestWidth(width)},c_limit/${rest}`;
}

// `srcset` with a 1x and a 2x variant so high-density screens stay sharp while
// ordinary screens download the smaller file. Undefined for non-Cloudinary URLs.
export function imageSrcSet(url, width = 640) {
  if (!isCloudinaryUrl(url)) return undefined;
  const oneX = nearestWidth(width);
  const twoX = nearestWidth(width * 2);
  const steps = oneX === twoX ? [oneX] : [oneX, twoX];
  return steps.map((step) => `${optimizeImageUrl(url, step)} ${step}w`).join(', ');
}
