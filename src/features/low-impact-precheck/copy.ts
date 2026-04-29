export const RESULT_COPY = {
  qualifies: {
    headline: 'Your shoot likely qualifies for Low Impact',
    subhead: 'You can expect faster processing and significant savings.',
    bodyParagraph:
      `Based on what you\u2019ve told us, your shoot hits the Low Impact Permit Pilot marks: a single location, three or fewer consecutive days, 30 or fewer on-set personnel, and no flagged activities. This likely means a lower permit fee, waived LAFD spot checks, and faster FilmLA coordination. Your estimated savings: see the fee comparison below. Before you file, verify your eligibility with FilmLA\u2014this is an estimate, not an approval.`,
  },

  needsReview: {
    headline: 'Your shoot likely needs a quick FilmLA review',
    subhead: 'You might still qualify. A few details need verification.',
    bodyParagraph:
      `You\u2019ve cleared most Low Impact requirements, but one or more items need FilmLA confirmation. Examples: non-consecutive filming days (KB is silent on gaps), large lighting setups (we can\u2019t guess wattage), or Rec & Parks property (which may be exempt). Reach out to FilmLA at permitting@filmla.com with your details. You\u2019ll likely still get Low Impact pricing\u2014it\u2019s just a quick clarification.`,
  },

  doesNotQualify: {
    headline: 'Your shoot does not qualify for Low Impact',
    subhead: 'But you have strong options to repackage and try again.',
    bodyParagraph:
      `One or more activities or locations disqualify you from Low Impact. However, you don\u2019t have to file Standard Tier for your entire shoot. Look at our suggestions below: you can split the shoot, isolate the blocker to a separate day, or repackage creatively and file multiple tiers. Many productions move the drone day or SFX sequence to Standard and keep the rest in Low Impact, cutting their overall fees and delays.`,
  },
};

export const TOP_STRIP_DISCLAIMER =
  'This is an estimate, not approval. KAIRO is not affiliated with FilmLA or the City of Los Angeles. Verify your eligibility with FilmLA before filing.';

export const FOOTER_DISCLAIMER =
  'KAIRO Low Impact Pre-Check is an independent estimating tool. Not affiliated with FilmLA, the City of Los Angeles, or any government agency. Estimates only — not legal, regulatory, or permit advice.';

export const FEE_COPY = {
  lowImpact: {
    label: 'Estimated Low Impact Fee',
    note: 'For projects that likely qualify.',
  },
  standard: {
    label: 'Standard Tier Fee (for comparison)',
    note: 'If you file all permit types as Standard.',
  },
  savings: {
    label: 'Estimated Savings',
    note: 'Low Impact vs. Standard, same project scope.',
  },
};

export const CTA_COPY = {
  fileWithFilmLA:
    'File your application with FilmLA at permitting@filmla.com or through their online portal.',
  contactSupport:
    'Questions? Email KAIRO support at [support email]. Feedback on this tool helps us improve.',
  termsLink: 'Read our full terms and privacy policy.',
};
