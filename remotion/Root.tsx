import React from "react";
import { Composition } from "remotion";
import { CarevaLaunch } from "./CarevaLaunch";
import { BNICut } from "./BNICut";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="CarevaLaunch"
    component={CarevaLaunch}
    durationInFrames={450}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition id="BNICut" component={BNICut} durationInFrames={900} fps={30} width={720} height={1280} />
  </>
);
