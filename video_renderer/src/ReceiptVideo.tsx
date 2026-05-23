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

interface Props {
  name: string;
  price: number;
  date: string;
  lang: 'EN' | 'OD';
}

export const ReceiptVideo: React.FC<Props> = ({ name, price, date, lang }) => {
  const [handle] = React.useState(() => delayRender());

  React.useEffect(() => {
    const loadOdiaFont = async () => {
      try {
        const font = new FontFace(
          "Noto Sans Oriya",
          "url(https://fonts.gstatic.com/s/notosansoriya/v31/x3djYyEw-HivM_1bXU91nN_44z-u0D0z.woff2)"
        );
        await font.load();
        document.fonts.add(font);
      } catch (err) {
        console.error("Failed to load Odia font", err);
      } finally {
        continueRender(handle);
      }
    };
    loadOdiaFont();
  }, [handle]);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bouncing animations
  const scaleSpring = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const slideUp = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 12 },
  });

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Multilingual translations
  const title = lang === 'OD' ? 'ପେମେଣ୍ଟ ରସିଦ୍' : 'PAYMENT RECEIPT';
  const subtitle = lang === 'OD' ? 'ସଫଳତାର ସହ ପ୍ରାପ୍ତ ହେଲା' : 'PAYMENT SUCCESSFUL';
  const nameLabel = lang === 'OD' ? 'ଗ୍ରାହକ ନାମ:' : 'Subscriber Name:';
  const priceLabel = lang === 'OD' ? 'ପେମେଣ୍ଟ ରାଶି:' : 'Amount Received:';
  const dateLabel = lang === 'OD' ? 'ପରବର୍ତ୍ତୀ ଶେଷ ତାରିଖ:' : 'New Expiry Date:';
  const statusLabel = lang === 'OD' ? 'ରିଚାର୍ଜ ସଫଳ ହେଲା' : 'Recharge Renewed';
  const footerLabel = lang === 'OD' ? 'ଆମ ସହିତ ଯୋଡି ହୋଇଥିବାରୁ ଧନ୍ୟବାଦ!' : 'Thank you for your business & happy viewing!';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#07090e',
        background: 'radial-gradient(circle, #061f14 0%, #06080d 100%)',
        fontFamily: lang === 'OD' ? "'Noto Sans Oriya', sans-serif" : "sans-serif",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#f3f4f6',
      }}
    >
      {/* Decorative success glowing orbs */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(50px)',
          opacity: opacity,
        }}
      />

      {/* Confetti Particle 1 (Mock styled) */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '20%',
          width: '20px',
          height: '20px',
          backgroundColor: '#34d399',
          borderRadius: '4px',
          transform: `rotate(${frame * 4}deg) translateY(${frame * 1.5}px)`,
          opacity: interpolate(frame, [0, 80], [1, 0]),
        }}
      />
      
      {/* Confetti Particle 2 (Mock styled) */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          right: '25%',
          width: '15px',
          height: '30px',
          backgroundColor: '#60a5fa',
          borderRadius: '3px',
          transform: `rotate(${-frame * 3}deg) translateY(${frame * 2}px)`,
          opacity: interpolate(frame, [0, 90], [1, 0]),
        }}
      />

      {/* Checkmark Circle Bouncing */}
      <div
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '4px solid #10b981',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '50px',
          transform: `scale(${scaleSpring})`,
          boxShadow: '0 0 50px rgba(16, 185, 129, 0.3)',
        }}
      >
        <span style={{ fontSize: '90px', fontWeight: 'bold', color: '#34d399', transform: 'translateY(-2px)' }}>✓</span>
      </div>

      {/* Dynamic Titles */}
      <div style={{ textAlign: 'center', marginBottom: '50px', opacity: opacity }}>
        <h2 style={{ fontSize: '32px', margin: 0, letterSpacing: '4px', color: '#34d399', fontWeight: 800 }}>
          {title}
        </h2>
        <h1 style={{ fontSize: '46px', margin: '15px 0 0 0', fontWeight: 700, color: '#ffffff' }}>
          {subtitle}
        </h1>
      </div>

      {/* Main Details Panel Card */}
      <div
        style={{
          width: '800px',
          background: 'linear-gradient(135deg, rgba(16, 28, 22, 0.8) 0%, rgba(13, 16, 24, 0.95) 100%)',
          border: '2px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '40px',
          padding: '60px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transform: `translateY(${interpolate(slideUp, [0, 1], [600, 0])}px)`,
          opacity: opacity,
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '20px' }}>
          <span style={{ fontSize: '26px', color: '#9ca3af', fontWeight: 600 }}>{nameLabel}</span>
          <span style={{ fontSize: '28px', color: '#ffffff', fontWeight: 700 }}>{name}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '20px' }}>
          <span style={{ fontSize: '26px', color: '#9ca3af', fontWeight: 600 }}>{priceLabel}</span>
          <span style={{ fontSize: '36px', color: '#34d399', fontWeight: 800 }}>Rs. {price}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '20px' }}>
          <span style={{ fontSize: '26px', color: '#9ca3af', fontWeight: 600 }}>{dateLabel}</span>
          <span style={{ fontSize: '28px', color: '#60a5fa', fontWeight: 700 }}>{date}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' }}>
          <span style={{ fontSize: '26px', color: '#9ca3af', fontWeight: 600 }}>Status:</span>
          <span style={{ fontSize: '24px', color: '#34d399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Thank you note */}
      <p
        style={{
          marginTop: '50px',
          textAlign: 'center',
          fontSize: '26px',
          color: '#a7f3d0',
          fontWeight: 600,
          opacity: opacity,
        }}
      >
        {footerLabel}
      </p>

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
