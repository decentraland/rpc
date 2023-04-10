module.exports = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: "test/tsconfig.json",
    }],
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/test/",
    "/src/protocol/index.ts",
    "/src/protocol/index_pb.js",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  testMatch: ["**/*.spec.(ts)"],
  testEnvironment: "node",
}
