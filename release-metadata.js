/* Alfvenica release metadata shared by the interface and automated checks. */
(function initReleaseMetadata(root, factory) {
  const metadata = factory();
  if (typeof module === 'object' && module.exports) module.exports = metadata;
  root.AlfvenicaRelease = metadata;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildReleaseMetadata() {
  'use strict';

  return Object.freeze({
    applicationName: 'Alfvenica',
    version: '1.1.0',
    releaseStatus: 'RELEASED',
    releaseDate: '2026-08-22',
    releaseTag: 'v1.1.0',
    validationDate: '2026-08-22',
    constantsRevision: 'NIST CODATA 2022',
    constantsSourceLabel: 'NIST CODATA 2022 constants',
    constantsSourceUrl: 'https://physics.nist.gov/cuu/Constants/',
    sourceCommit: null,
    sourceCommitStatus: 'UNAVAILABLE_NOT_EMBEDDED',
    buildKind: 'browser-source-or-generated-standalone',
    physicsCoreBaseline: '9ad37ae',
    physicsCoreBaselineStatus: 'V1_1_0_RELEASED_FROZEN',
    physicsCoreChangeSet: 'SCIENTIFIC_RESOLUTION_PASS_1_SD_10',
    physicsCoreSha256: 'e6b039b9f18428a761fe4fd2b5616f1530ec26e875436ae616988aa52fac4756',
    formulaSmokeCount: 70,
    plotMetricCount: 28,
    htmlIdCount: 100,
    repositoryUrl: 'https://github.com/mkchettri8/alfvenica',
    physicsBaselineUrl: 'https://github.com/mkchettri8/alfvenica/commit/9ad37ae88fddba4cf898099cf96b821a75829ee9',
    ciUrl: 'https://github.com/mkchettri8/alfvenica/actions/workflows/tests.yml',
    formulaAuditUrl: 'https://github.com/mkchettri8/alfvenica/blob/main/FORMULA_AUDIT.md',
    scientificIssueUrl: 'https://github.com/mkchettri8/alfvenica/issues/new?template=scientific_correction.yml',
    citation: 'Chettri, M. K. (2026). Alfvenica: Interactive Space Plasma Toolkit (Version 1.1.0) [Computer software]. https://alfvenica.org/',
    bibtex: '@software{chettri_alfvenica_2026,\n  author  = {Chettri, Mani K},\n  title   = {Alfvenica: Interactive Space Plasma Toolkit},\n  version = {1.1.0},\n  year    = {2026},\n  url     = {https://alfvenica.org/}\n}',
  });
}));
