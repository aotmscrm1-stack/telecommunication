import React from 'react';

export const Footer = () => {
  return (
    <footer style={{ padding: '28px 24px', textAlign: 'center', fontSize: 12.5, color: '#94a3b8', borderTop: '1px solid #eef2f7' }}>
      &copy; {new Date().getFullYear()} AOTMS. All rights reserved.
    </footer>
  );
};

export default Footer;
