// Shrinks a photo in the browser so it uploads (and prints) at a sensible size.

// File-picker `accept` value: the extensions are listed too because some systems match on those, not on MIME types.
export const IMAGE_ACCEPT = 'image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp';

const TYPE_BY_EXTENSION = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp' };

// Some systems report a screenshot's type as empty or generic, so decode by content and only use the name as a hint.
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const guessed = TYPE_BY_EXTENSION[(file.name.split('.').pop() || '').toLowerCase()];
    const source = file.type.startsWith('image/') ? file : new Blob([file], { type: guessed || 'image/png' });
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image. Try a PNG or JPG.")); };
    img.src = url;
  });
}

export function scaledJpeg(img, maxDim, quality) {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
