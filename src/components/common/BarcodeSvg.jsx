import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Authentic, scannable Code 128 / Code 39 / EAN Barcode component
 * Uses JsBarcode to generate compliant vector SVG barcodes that scan on
 * physical optical handheld scanners and mobile camera barcode readers.
 */
export default function BarcodeSvg({
  value,
  format = 'CODE128',
  width = 2,
  height = 40,
  displayValue = false,
  fontSize = 12,
  margin = 0,
  background = 'transparent',
  lineColor = '#000000',
  className = '',
  alt = 'Barcode',
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        // Sanitize string to prevent barcode crash
        const sanitized = String(value).trim();
        if (sanitized) {
          JsBarcode(svgRef.current, sanitized, {
            format,
            width,
            height,
            displayValue,
            fontSize,
            margin,
            background,
            lineColor,
            valid: () => {},
          });
        }
      } catch (err) {
        console.warn('[BarcodeSvg] Error generating barcode:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, margin, background, lineColor]);

  if (!value) return null;

  return <svg ref={svgRef} className={`max-w-full select-none ${className}`} aria-label={alt} />;
}
