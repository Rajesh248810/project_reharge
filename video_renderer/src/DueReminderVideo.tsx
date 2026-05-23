import React from 'react';
import { 
  useCurrentFrame, 
  useVideoConfig, 
  interpolate, 
  spring,
  AbsoluteFill,
  delayRender,
  continueRender
} from 'remotion';

const waitForFont = delayRender();
const font = new FontFace(
  "Noto Sans Oriya",
  "url(https://fonts.gstatic.com/s/notosansoriya/v26/x3djYyEw-HivM_1bXU91nN_44z-u0D0z.woff2)"
);
font.load().then(() => {
  document.fonts.add(font);
  continueRender(waitForFont);
}).catch(() => {
  continueRender(waitForFont);
});

interface Props {
  name: string;
  price: number;
  date: string;
  lang: 'EN' | 'OD';
}

export const DueReminderVideo: React.FC<Props> = ({ name, price, date, lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations using springs
  const slideUp = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const glowScale = interpolate(
    Math.sin(frame / 10),
    [-1, 1],
    [0.98, 1.02]
  );

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Multilingual translations
  const title = lang === 'OD' ? 'କେବୁଲ୍ ଟିଭି ନୋଟିସ୍' : 'CABLE TV NOTICE';
  const subtitle = lang === 'OD' ? 'ପ୍ଲାନ ସମାପ୍ତ ହେଉଛି' : 'PLAN EXPIRING SOON';
  const nameLabel = lang === 'OD' ? 'ଗ୍ରାହକ:' : 'Customer:';
  const priceLabel = lang === 'OD' ? 'ପେମେଣ୍ଟ ରାଶି:' : 'Outstanding Price:';
  const dateLabel = lang === 'OD' ? 'ଶେଷ ତାରିଖ:' : 'Expiry Date:';
  const footerLabel = lang === 'OD' ? 'ସେବା ଜାରି ରଖିବା ପାଇଁ ଦୟାକରି ରିଚାର୍ଜ କରନ୍ତୁ।' : 'Please pay to avoid connection suspension. Thank you!';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#07090e',
        background: 'radial-gradient(circle, #0f1322 0%, #06080d 100%)',
        fontFamily: lang === 'OD' ? "'Noto Sans Oriya', sans-serif" : "sans-serif",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#f3f4f6',
      }}
    >
      {/* Dynamic Background Particles (Mock styling) */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,119,6,0.1) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(50px)',
          opacity: opacity,
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(60px)',
          opacity: opacity,
        }}
      />

      {/* Main Card Container */}
      <div
        style={{
          width: '800px',
          background: 'linear-gradient(135deg, rgba(23, 26, 38, 0.8) 0%, rgba(13, 16, 24, 0.95) 100%)',
          border: '2px solid rgba(217, 119, 6, 0.2)',
          borderRadius: '40px',
          padding: '60px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transform: `translateY(${interpolate(slideUp, [0, 1], [600, 0])}px) scale(${glowScale})`,
          opacity: opacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Pulsating Alert Icon Indicator */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            border: '2px solid #d97706',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '40px',
            boxShadow: '0 0 30px rgba(217, 119, 6, 0.2)',
          }}
        >
          <span style={{ fontSize: '60px', fontWeight: 'bold', color: '#fbbf24' }}>!</span>
        </div>

        {/* Dynamic Titles */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '32px', margin: 0, letterSpacing: '4px', color: '#fbbf24', fontWeight: 800 }}>
            {title}
          </h2>
          <h1 style={{ fontSize: '46px', margin: '15px 0 0 0', fontWeight: 700, color: '#f3f4f6' }}>
            {subtitle}
          </h1>
        </div>

        {/* Customer Details Content Grid */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '24px',
            padding: '40px',
            marginBottom: '50px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '20px' }}>
            <span style={{ fontSize: '26px', color: '#9ca3af', fontWeight: 600 }}>{nameLabel}</span>
            <span style={{ fontSize: '28px', color: '#ffffff', fontWeight: 700 }}>{name}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '20px' }}>
            <span style={{ fontSize: '26px', color: '#9ca3af', fontWeight: 600 }}>{priceLabel}</span>
            <span style={{ fontSize: '34px', color: '#f87171', fontWeight: 800 }}>Rs. {price}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' }}>
            <span style={{ fontSize: '26px', color: '#9ca3af', fontWeight: 600 }}>{dateLabel}</span>
            <span style={{ fontSize: '28px', color: '#fbbf24', fontWeight: 700 }}>{date}</span>
          </div>
        </div>

        {/* Footer Wording */}
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: '24px',
            lineHeight: '36px',
            color: '#9ca3af',
            fontWeight: 500,
          }}
        >
          {footerLabel}
        </p>
      </div>

      {/* Brand Watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '2px',
          color: '#4b5563',
          opacity: opacity,
        }}
      >
        CABLE OPERATOR NETWORK
      </div>
    </AbsoluteFill>
  );
};
