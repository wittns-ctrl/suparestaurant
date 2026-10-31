import { useState } from 'react';
import { optimizeImageUrl, imageSrcSet, nearestWidth } from '../../utils/images';

// Drop-in <img> that is cheap by default:
//  - lazy-loaded and decoded off the main thread (pass `eager` for above-the-fold images),
//  - Cloudinary photos are requested resized and in WebP/AVIF (see utils/images.js),
//  - if the optimised URL ever fails to load, it falls back to the original URL once,
//    so a CDN hiccup or account setting can never turn into a broken picture.
// `width` is the largest size (in CSS pixels) the image is displayed at.
const SmartImage = ({ src, alt = '', width = 640, sizes, eager = false, onError, ...rest }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const useOriginal = failedSrc === src;

  const optimized = useOriginal ? src : optimizeImageUrl(src, width);
  const srcSet = useOriginal ? undefined : imageSrcSet(src, width);

  return (
    <img
      {...rest}
      src={optimized}
      srcSet={srcSet}
      sizes={srcSet ? sizes || `${nearestWidth(width)}px` : undefined}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={(event) => {
        if (!useOriginal && optimized !== src) setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
};

export default SmartImage;
