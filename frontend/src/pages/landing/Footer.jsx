import React from 'react';
import HalftoneWordmarkFooter from '../../components/ui/halftone-wordmark-footer';

export const Footer = () => {
  return (
    <div id="contact" className="w-full relative z-10 bg-white border-t border-slate-200">
      <HalftoneWordmarkFooter
        wordmark="crm"
        label=""
        meta=""
        columns={[]}
        preset="paper"
        palette={{
          background: '#ffffff',
          ink: '#090d16',
          warm: '#2563eb',
        }}
        dotGap={6}
        radius={90}
        crop={0.2}
        grain={0.15}
        interactive={true}
        height="500px"
        backToTop={true}
      />
    </div>
  );
};

export default Footer;
