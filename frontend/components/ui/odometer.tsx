"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type OdometerProps = {
  value: number;
  className?: string;
};

function formatNumberParts(n: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n).split("");
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const HEIGHT_REM = 2.25; // ความสูงตรงกับ text-4xl (36px / 2.25rem)

export function Odometer({ value, className = "" }: OdometerProps) {
  const prevRef = useRef<number>(value);
  const [flash, setFlash] = useState(false);

  const parts = useMemo(() => formatNumberParts(value), [value]);

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      className={`inline-flex items-center text-4xl font-extrabold transition-colors duration-300 ${
        flash ? "text-blue-500" : "text-blue-600"
      } ${className}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {parts.map((ch, i) => {
        const isDigit = /[0-9]/.test(ch);

        if (!isDigit) {
          return (
            <span key={`sym-${i}`} className="inline-block px-[1px]">
              {ch}
            </span>
          );
        }

        return (
          <DigitColumn key={`col-${parts.length - i}`} digit={Number(ch)} />
        );
      })}
    </span>
  );
}

function DigitColumn({ digit }: { digit: number }) {
  return (
    <span
      className="relative inline-block overflow-hidden align-middle"
      style={{
        height: `${HEIGHT_REM}rem`,
        width: "0.65em",
      }}
    >
      <span
        className="absolute left-0 top-0 flex flex-col w-full transition-transform"
        style={{
          transform: `translateY(-${digit * HEIGHT_REM}rem)`,
          transitionDuration: "700ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
        }}
      >
        {DIGITS.map((n) => (
          <span
            key={n}
            className="flex items-center justify-center w-full"
            style={{
              height: `${HEIGHT_REM}rem`,
              lineHeight: `${HEIGHT_REM}rem`,
            }}
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

export default Odometer;