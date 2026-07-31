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
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts'
  ],
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 70,
      lines: 68,
      statements: 67
    }
  }
};