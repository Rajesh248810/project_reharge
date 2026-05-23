import React from 'react';
import { Composition } from 'remotion';
import { DueReminderVideo } from './DueReminderVideo';
import { ReceiptVideo } from './ReceiptVideo';

export const VideoCompositions: React.FC = () => {
  return (
    <>
      <Composition
        id="DueReminderVideo"
        component={DueReminderVideo}
        durationInFrames={150} // 5 Seconds at 30 fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          name: 'Manoj Kumar Sahoo',
          price: 250,
          date: '2026-05-31',
          lang: 'OD'
        }}
      />
      <Composition
        id="ReceiptVideo"
        component={ReceiptVideo}
        durationInFrames={150} // 5 Seconds at 30 fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          name: 'Manoj Kumar Sahoo',
          price: 250,
          date: '2026-06-30',
          lang: 'OD'
        }}
      />
    </>
  );
};
