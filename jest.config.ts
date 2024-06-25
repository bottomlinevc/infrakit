import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.[jt]s?(x)"],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: ["<rootDir>/node_modules/"],
  coverageReporters: ["json", "text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  projects: [
    {
      preset: "ts-jest",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
      testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
    },
    {
      runner: "jest-runner-eslint",
      displayName: "lint",
      testMatch: [
        "<rootDir>/src/**/*.?(m)[jt]s?(x)",
        "<rootDir>/tests/**/*.?(m)[jt]s?(x)",
      ],
      testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
      transform: {
        "^.+\\.(t|j)s$": "ts-jest",
      },
    },
  ],
};

export default config;
