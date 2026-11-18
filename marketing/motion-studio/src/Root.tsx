import React from 'react';
import { Composition } from 'remotion';
import { Film, DURATION_S, FPS } from './Film';

export const Root: React.FC = () => (
  <>
    <Composition id="UvcWide" component={Film} durationInFrames={Math.round(DURATION_S * FPS)} fps={FPS} width={1920} height={1080} />
    <Composition id="UvcReel" component={Film} durationInFrames={Math.round(DURATION_S * FPS)} fps={FPS} width={1080} height={1920} />
  </>
);
