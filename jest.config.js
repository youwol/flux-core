module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  reporters: [ "default", "jest-junit"],
  modulePathIgnorePatterns : ["/dist"],
  moduleDirectories: [
    "node_modules","src"
  ],
  moduleNameMapper: {
    "@youwol/cdn-client": "<rootDir>/node_modules/@youwol/cdn-client",
  }
};