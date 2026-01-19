// Basic test to verify Jest configuration
describe("Project Setup", () => {
  test("Jest is properly configured", () => {
    expect(true).toBe(true);
  });

  test("Node.js environment is available", () => {
    expect(process.version).toBeDefined();
    expect(typeof require).toBe("function");
  });
});
