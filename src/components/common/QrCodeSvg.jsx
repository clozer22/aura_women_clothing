import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Authentic, scannable QR Code generator using vector SVG
 * Generates standard ISO/IEC 18004 QR codes that can be scanned by any smartphone camera.
 */
export default function QrCodeSvg({
  value,
  size = 64,
  margin = 1,
  colorDark = '#000000',
  colorLight = '#ffffff00',
  className = '',
}) {
  const [svgMarkup, setSvgMarkup] = useState('');

  useEffect(() => {
    if (!value) {
      setSvgMarkup('');
      return;
    }

    QRCode.toString(
      String(value),
      {
        type: 'svg',
        width: size,
        margin,
        color: {
          dark: colorDark,
          light: colorLight,
        },
      },
      (err, str) => {
        if (!err && str) {
          setSvgMarkup(str);
        } else if (err) {
          console.warn('[QrCodeSvg] Error generating QR code:', err);
        }
      }
    );
  }, [value, size, margin, colorDark, colorLight]);

  if (!svgMarkup) return null;

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
