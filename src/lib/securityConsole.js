// ==============================================================================
// WEBUILDWEB OFFICIAL - DEVTOOLS CONSOLE SECURITY & ANTI-SELF-XSS PROTECTION
// Protects users against malicious console copy-paste scripts (Self-XSS)
// ==============================================================================

export function initSecurityConsole() {
  if (typeof window === 'undefined') return;

  // Prevent multiple executions
  if (window.__WEBUILDWEB_SECURITY_INITIALIZED__) return;
  window.__WEBUILDWEB_SECURITY_INITIALIZED__ = true;

  try {
    const bannerStyle = [
      'background: #131722',
      'color: #3b82f6',
      'padding: 10px 16px',
      'font-size: 16px',
      'font-weight: 800',
      'letter-spacing: 2px',
      'border-radius: 6px',
      'border: 1px solid #1e293b',
      'font-family: monospace',
    ].join(';');

    const stopStyle = [
      'background: #ef4444',
      'color: #ffffff',
      'padding: 6px 14px',
      'font-size: 24px',
      'font-weight: 900',
      'letter-spacing: 3px',
      'border-radius: 4px',
      'font-family: sans-serif',
      'text-shadow: 0 1px 2px rgba(0,0,0,0.5)',
    ].join(';');

    const warningHeadingStyle = [
      'color: #ef4444',
      'font-size: 14px',
      'font-weight: 700',
      'padding-top: 6px',
      'font-family: sans-serif',
    ].join(';');

    const bodyStyle = [
      'color: #94a3b8',
      'font-size: 12px',
      'line-height: 1.6',
      'font-family: sans-serif',
    ].join(';');

    const highlightStyle = [
      'color: #f59e0b',
      'font-size: 12px',
      'font-weight: 700',
      'font-family: sans-serif',
    ].join(';');

    const footerStyle = [
      'color: #64748b',
      'font-size: 10px',
      'font-style: italic',
      'padding-top: 4px',
      'font-family: sans-serif',
    ].join(';');

    // 1. WEBUILDWEB Official Platform Banner
    console.log('%c⚡ WEBUILDWEB OFFICIAL ⚡', bannerStyle);

    // 2. High-Impact Stop Notice (Self-XSS Protection)
    console.log('%c⛔ STOP!', stopStyle);
    console.log('%cThis is a browser feature intended strictly for developers and engineers.', warningHeadingStyle);

    console.log(
      '%cIf someone told you to copy-paste anything here or run a script to get discounts, free garments, or access hidden features, %cIT IS A SCAM (Self-XSS)%c.\n\n' +
      'Pasting unknown code here can give attackers full access to your session, personal data, and customer account.\n\n' +
      'For official customer inquiries or security reporting, contact: care@aurawomen.com',
      bodyStyle,
      highlightStyle,
      bodyStyle
    );

    console.log(
      '%c© 2026 Aura Women\'s Clothing. Platform engineered & secured by WeBuildWeb Official.',
      footerStyle
    );
  } catch (err) {
    // Fail silently in environments where console styling is unsupported
  }
}
