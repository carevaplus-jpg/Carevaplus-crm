import React from "react";
import { Composition } from "remotion";
import { CarevaLaunch } from "./CarevaLaunch";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="CarevaLaunch"
    component={CarevaLaunch}
    durationInFrames={450}
    fps={30}
    width={1920}
    height={1080}
  />
);
