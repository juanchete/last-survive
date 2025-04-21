
"use client";
import { AnimatedWords } from "./AnimatedWords";

function HeroStadium({
  badge = "Survivor Fantasy League",
  mainLine = "Be The Last One",
  subWords = <AnimatedWords />
}: {
  badge?: string;
  mainLine?: string;
  subWords?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden bg-black">
      {/* Stadium image background */}
      <img
        src="/lovable-uploads/6a1c877f-509b-4ecd-b63b-4b6d9d397550.png"
        alt="Football field stadium lights"
        className="absolute inset-0 w-full h-full object-cover object-bottom opacity-90"
        draggable={false}
        style={{
          filter: "contrast(1.2) brightness(0.85)"
        }}
      />
      {/* Overlay for blue and black tint */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-nfl-blue/50 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 w-full px-4 md:px-0 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-nfl-blue/20 mb-8 mt-8 border border-white/10 backdrop-blur-md shadow-lg max-w-fit">
          <span className="w-2 h-2 rounded-full bg-nfl-blue animate-pulse"></span>
          <span className="text-sm md:text-base text-white font-medium uppercase tracking-widest">{badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-2xl bg-gradient-to-r from-white to-nfl-blue bg-clip-text text-transparent mb-2">
          {mainLine}
        </h1>
        <div className="leading-snug mb-8 h-[68px] md:h-[82px] flex items-center justify-center">
          {subWords}
        </div>
        <p className="text-lg md:text-2xl text-white/80 font-medium max-w-xl mx-auto mb-8 md:mb-12">
          Outlast your rivals! Each week, the lowest scoring team is eliminated. Strategize, adapt, and become the last survivor on the field.
        </p>
      </div>
      {/* Fade bottom for readability */}
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black to-transparent pointer-events-none z-30" />
    </div>
  );
}

export { HeroStadium };
