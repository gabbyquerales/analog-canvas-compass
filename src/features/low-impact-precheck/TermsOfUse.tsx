import React from 'react';

export default function TermsOfUse() {
  return (
    <div
      className="min-h-screen p-6 md:p-12"
      style={{
        backgroundColor: '#FFFEFB',
        color: '#1A1A1A',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        className="max-w-2xl mx-auto p-8"
        style={{
          border: '2px solid #1A1A1A',
          borderRadius: '14px 18px 14px 18px',
          backgroundColor: '#FFFEFB',
          boxShadow: '3px 3px 0 #1A1A1A',
        }}
      >
        <h1
          className="text-3xl font-bold mb-8"
          style={{
            fontFamily: '"Bradley Hand", "Marker Felt", "Caveat", "Comic Sans MS", cursive',
          }}
        >
          Terms of Use
        </h1>

        <section className="mb-8">
          <h2
            className="text-2xl font-bold mb-4"
            style={{
              fontFamily: '"Bradley Hand", "Marker Felt", "Caveat", "Comic Sans MS", cursive',
            }}
          >
            What this tool is
          </h2>
          <p className="text-lg leading-relaxed">
            A free pre-check that estimates whether your shoot is likely to qualify for
            FilmLA's Low Impact Permit Pilot, based on publicly available FilmLA
            documentation.
          </p>
        </section>

        <section className="mb-8">
          <h2
            className="text-2xl font-bold mb-4"
            style={{
              fontFamily: '"Bradley Hand", "Marker Felt", "Caveat", "Comic Sans MS", cursive',
            }}
          >
            What this tool is not
          </h2>
          <p className="text-lg leading-relaxed">
            It is not an application, not an approval, and not legal or regulatory advice.
            KAIRO is not affiliated with FilmLA, the City of Los Angeles, the Los Angeles
            Fire Department, or any government agency.
          </p>
        </section>

        <section className="mb-8">
          <h2
            className="text-2xl font-bold mb-4"
            style={{
              fontFamily: '"Bradley Hand", "Marker Felt", "Caveat", "Comic Sans MS", cursive',
            }}
          >
            Rules and accuracy
          </h2>
          <p className="text-lg leading-relaxed">
            Pilot rules are set by FilmLA and may change without notice. We update the tool
            when we see changes, but we cannot guarantee real-time accuracy. Always verify
            directly with FilmLA before filing your permit.
          </p>
        </section>

        <section className="mb-8">
          <h2
            className="text-2xl font-bold mb-4"
            style={{
              fontFamily: '"Bradley Hand", "Marker Felt", "Caveat", "Comic Sans MS", cursive',
            }}
          >
            No liability
          </h2>
          <p className="text-lg leading-relaxed">
            KAIRO is not responsible for application denials, fee differences, lost shoot
            days, schedule delays, or any other outcome resulting from use of this tool. You
            use it at your own discretion.
          </p>
        </section>

        <section>
          <h2
            className="text-2xl font-bold mb-4"
            style={{
              fontFamily: '"Bradley Hand", "Marker Felt", "Caveat", "Comic Sans MS", cursive',
            }}
          >
            Feedback
          </h2>
          <p className="text-lg leading-relaxed">
            Found a bug or a rule that's out of date?{' '}
            <a
              href="mailto:feedback@kairo.com"
              className="underline"
              style={{ color: '#4A90E2' }}
            >
              Send us feedback
            </a>
            .
          </p>
        </section>

        <div className="mt-12 pt-8 border-t-2 border-gray-300">
          <p className="text-sm text-gray-600">
            KAIRO Low Impact Pre-Check is an independent estimating tool. Not affiliated with
            FilmLA, the City of Los Angeles, or any government agency. Estimates only — not
            legal, regulatory, or permit advice.
          </p>
        </div>
      </div>
    </div>
  );
}
