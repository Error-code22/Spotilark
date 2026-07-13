"use client";

import React from "react";

interface PlayerAudioProps {
  audioRef: React.Ref<HTMLAudioElement>;
  nextAudioRef: React.Ref<HTMLAudioElement>;
  rightAudioRef: React.Ref<HTMLAudioElement>;
  onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  onEnded: () => void;
  onRightTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  onRightLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  onRightEnded: () => void;
}

export default function PlayerAudio({
  audioRef,
  nextAudioRef,
  rightAudioRef,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onRightTimeUpdate,
  onRightLoadedMetadata,
  onRightEnded,
}: PlayerAudioProps) {
  return (
    <>
      <audio
        ref={audioRef}
        id="spotilark-audio"
        crossOrigin="anonymous"
        className="hidden"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
      <audio
        ref={nextAudioRef}
        id="spotilark-audio-next"
        crossOrigin="anonymous"
        className="hidden"
      />
      <audio
        ref={rightAudioRef}
        id="spotilark-audio-right"
        crossOrigin="anonymous"
        className="hidden"
        onTimeUpdate={onRightTimeUpdate}
        onLoadedMetadata={onRightLoadedMetadata}
        onEnded={onRightEnded}
      />
    </>
  );
}
