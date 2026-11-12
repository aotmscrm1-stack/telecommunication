import DOMPurify from 'dompurify';

/**
 * Sanitise HTML before it is injected with `dangerouslySetInnerHTML`.
 *
 * Inbound email bodies, campaign previews and template previews are all authored
 * outside this application, so they must be treated as untrusted. Stripping
 * scripts, event handlers and dangerous URLs is what stops a crafted email from
 * reading `localStorage` (which holds the session JWT) or acting as the user.
 *
 * Safe formatting is preserved: tables, inline styles, images, links.
 */
const CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'base'],
  FORBID_ATTR: ['srcdoc', 'formaction'],
  ALLOW_DATA_ATTR: false,
};

// Email HTML leans on inline styles and should open links in a new tab without
// handing the opener window to the destination.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(String(html), CONFIG);
}

export default sanitizeHtml;
