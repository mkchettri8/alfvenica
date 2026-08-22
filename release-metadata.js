/* Alfvenica release metadata shared by the interface and automated checks. */
(function initReleaseMetadata(root, factory) {
  const metadata = factory();
  if (typeof module === 'object' && module.exports) module.exports = metadata;
  root.AlfvenicaRelease = metadata;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildReleaseMetadata() {
  'use strict';

  return Object.freeze({
    applicationName: 'Alfvenica',
    version: '1.0.1',
    releaseDate: '2026-08-10',
    validationDate: '2026-08-10',
    constantsRevision: 'NIST CODATA 2022',
    constantsSourceLabel: 'NIST CODATA 2022 constants',
    constantsSourceUrl: 'https://physics.nist.gov/cuu/Constants/',
    sourceCommit: null,
    sourceCommitStatus: 'UNAVAILABLE_NOT_EMBEDDED',
    buildKind: 'browser-source-or-generated-standalone',
    physicsCoreBaseline: '9ad37ae',
    physicsCoreSha256: '3b55dd4e641aa6fb2de32de2b656a990055cf93ef8809f494c90f9d7f00d2f92',
    formulaSmokeCount: 70,
    plotMetricCount: 28,
    htmlIdCount: 100,
    repositoryUrl: 'https://github.com/mkchettri8/alfvenica',
    physicsBaselineUrl: 'https://github.com/mkchettri8/alfvenica/commit/9ad37ae88fddba4cf898099cf96b821a75829ee9',
    ciUrl: 'https://github.com/mkchettri8/alfvenica/actions/workflows/tests.yml',
    formulaAuditUrl: 'https://github.com/mkchettri8/alfvenica/blob/main/FORMULA_AUDIT.md',
    scientificIssueUrl: 'https://github.com/mkchettri8/alfvenica/issues/new?template=scientific_correction.yml',
    citation: 'Chettri, M. K. (2026). Alfvenica: Interactive Space Plasma Toolkit (Version 1.0.1) [Computer software]. https://alfvenica.org/',
    bibtex: '@software{chettri_alfvenica_2026,\n  author  = {Chettri, Mani K},\n  title   = {Alfvenica: Interactive Space Plasma Toolkit},\n  version = {1.0.1},\n  year    = {2026},\n  url     = {https://alfvenica.org/}\n}',
  });
}));
