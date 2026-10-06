import React, { useEffect } from 'react';
import html2a4tmpl from 'html-to-a4-template';
import './a4template.css';

export function A4Container({ children, className = '', ...props }) {
  useEffect(() => {
    try {
      if (typeof html2a4tmpl === 'function') {
        const { execPaging } = html2a4tmpl('.a4-container', 'auto');
        if (typeof execPaging === 'function') {
          setTimeout(() => execPaging(), 100);
        }
      }
    } catch (err) {
      console.warn('[html-to-a4-template] Paging execution notice:', err.message);
    }
  }, []);

  return (
    <div className={`a4-container ${className}`} {...props}>
      {children}
    </div>
  );
}

export function A4Page({ children, className = '', ...props }) {
  return (
    <div className={`a4-page ${className}`} {...props}>
      {children}
    </div>
  );
}

export function A4Unit({ children, className = '', ...props }) {
  return (
    <div className={`a4-unit ${className}`} {...props}>
      {children}
    </div>
  );
}

export function A4Table({ children, className = '', ...props }) {
  return (
    <table className={`a4-table ${className}`} {...props}>
      {children}
    </table>
  );
}

export default A4Container;
