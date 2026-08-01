module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // `jose` (v6) est publié uniquement en ESM. Node >= 20.19 sait le charger
  // depuis du CommonJS via require(), mais Jest utilise son propre registre de
  // modules et en est incapable : toute suite important auth.service.ts échouait
  // sur « Unexpected token 'export' ». C'est la raison pour laquelle ce fichier
  // est resté à 0 % de couverture — et donc pour laquelle la faille C2 (secret
  // JWT par défaut) a pu être livrée sans qu'aucun test ne la voie.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
    '^.+\\.m?js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs' } }]
  },
  transformIgnorePatterns: ['/node_modules/(?!jose)'],
  collectCoverage: true,
  // Le périmètre couvrait `src/**` seulement, c'est-à-dire les services métier
  // testables — pas `services/api-gateway/src/**`, qui EST l'application
  // déployée. La couverture annoncée valait donc 77 % sur un périmètre qui
  // excluait le code réellement livré (audit, point H9).
  //
  // Exclusions assumées : `main.ts` (amorçage), `*.module.ts` (câblage
  // déclaratif) et les DTO (déclarations de validation sans logique).
  collectCoverageFrom: [
    'src/**/*.ts',
    'services/api-gateway/src/**/*.ts',
    'libs/**/*.ts',
    '!**/*.spec.ts',
    '!**/main.ts',
    '!**/*.module.ts',
    '!**/dto/**'
  ],
  coverageReporters: ["text", "lcov"],
  // Seuils volontairement calés sur la mesure réelle du périmètre élargi, et
  // non sur l'ancienne valeur : le périmètre ayant triplé, les deux chiffres ne
  // sont pas comparables. Ils jouent le rôle de cliquet — la couverture ne peut
  // plus régresser — et rendent visible l'écart avec l'objectif de 70 %, qui
  // n'est PAS atteint sur le périmètre réel.
  coverageThreshold: {
    global: {
      branches: 32,
      functions: 37,
      lines: 39,
      statements: 39
    }
  }
};