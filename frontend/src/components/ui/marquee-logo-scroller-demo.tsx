import React from 'react';
import { MarqueeLogoScroller } from '@/components/ui/marquee-logo-scroller';

export const MarqueeDemo = () => {
  const partners = [
    {
      src: 'https://cdn.21st.dev/assets/mirror/2b/2b87e7cd0c48dbf324666f347340afc1156fc86a466021e480ac9c288c618fd6.svg',
      alt: 'Procure',
      gradient: { from: '#668CFF', via: '#0049FF', to: '#003199' },
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/86/86e19afda708cead229b714d25de147ef0b920cfea807c5b2933b30d17a234db.svg',
      alt: 'Clerk',
      gradient: { from: '#FFE766', via: '#FFCE00', to: '#B38F00' },
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/60/60a4c31343f8356ecbaaee324bd6253deacd8a6c27c3fe33f06ecc59ed4bd164.svg',
      alt: 'Blender',
      gradient: { from: '#6690F0', via: '#255BE3', to: '#193B99' },
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/5b/5bcdea3417293412845b8298fe357fce3b192e8ff112d9b3fef315bc5cd127f6.svg',
      alt: 'Figma',
      gradient: { from: '#C4C2FF', via: '#9896FF', to: '#5B4DCC' },
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/d3/d3f7f94d90089fd318a2649807d5d57cf353affcf9d4cd2c5d373062822cf507.svg',
      alt: 'Mocha',
      gradient: { from: '#FF66A1', via: '#FF007A', to: '#B3005A' },
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/59/59c903cc3c11f4fc63286675a5460bbaa5c80643acf85c3dd2394b27ab00eaf5.svg',
      alt: 'Layers',
      gradient: { from: '#D9FF5A', via: '#AFFF01', to: '#7A9900' },
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/e3/e314a1d65f5035bdcebb84ed740ed0341cc5ba15ecf22fa2c1b10d39fbe18880.svg',
      alt: 'Google Cloud',
      gradient: { from: '#8AA7FF', via: '#5F86FF', to: '#3A5ACC' },
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/19/192d4671a23e40c7deb8fb16c48970e27f116a6ca5cc648eb6e3b366f5c8dd6d.svg',
      alt: 'Framer',
      gradient: { from: '#67F0D1', via: '#2AE5B9', to: '#1B8F72' },
    },
  ];

  return (
    <div className="bg-background min-h-[400px] w-full flex items-center justify-center p-4">
      <MarqueeLogoScroller
        title="Trusted by Businesses Worldwide"
        description="Founders, developers, and business leaders across the globe chose us for their digital asset operations."
        logos={partners}
        speed="normal"
      />
    </div>
  );
};

export default MarqueeDemo;

