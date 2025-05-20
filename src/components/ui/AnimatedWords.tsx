
import React, { useEffect, useState, useRef } from "react";

const words = ["Draft", "Play", "Survive", "Eliminate", "Strategize"];

export function AnimatedWords() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const speed = deleting ? 80 : 150;

  useEffect(() => {
    if (subIndex === words[index].length + 1 && !deleting) {
      setTimeout(() => setDeleting(true), 1000);
      return;
    }
    if (subIndex === 0 && deleting) {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex(
        (prev) =>
          prev +
          (deleting ? -1 : 1)
      );
    }, speed);

    return () => clearTimeout(timeout);
  }, [subIndex, index, deleting]);

  return (
    <span
      className="inline-block min-w-[126px] transition-colors duration-300 bg-gradient-to-r from-white via-nfl-blue to-white bg-clip-text text-transparent text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg"
      aria-label={words[index]}
    >
      {`${words[index].substring(0, subIndex)}`}
      <span className="animate-pulse text-nfl-blue">|</span>
    </span>
  );
}
