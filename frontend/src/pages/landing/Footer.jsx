import React from 'react';
import HalftoneWordmarkFooter from '../../components/ui/halftone-wordmark-footer';
import { cobalt, ink } from './theme';

export const Footer = () => {
  return (
    <div
      id="contact"
      style={{
        width: '100%',
        position: 'relative',
        zIndex: 10,
        background: ink[950],
        borderTop: `1px solid ${ink[800]}`,
      }}
    >
      <HalftoneWordmarkFooter
        wordmark="crm"
        label=""
        meta=""
        columns={[]}
        preset="night"
        palette={{
          background: ink[950],
          ink: '#E8EDF7',
          warm: cobalt[500],
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
