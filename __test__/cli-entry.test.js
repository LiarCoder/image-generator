const { main } = require("../bin/image-gen.js");

// Mock all the dependencies
jest.mock("../src/cli");
jest.mock("../src/imageGenerator");
jest.mock("../src/fileUtils");
jest.mock("../src/utils");

describe("CLI Entry Point", () => {
  let mockConsole;
  let mockProcess;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: jest.spyOn(console, "log").mockImplementation(() => {}),
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
    };

    // Mock process.exit
    mockProcess = {
      exit: jest.spyOn(process, "exit").mockImplementation(() => {}),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
    mockProcess.exit.mockRestore();
  });

  test("应该正确处理成功的图片生成", async () => {
    // Mock dependencies
    const {
      parseArguments,
      displayProgress,
      displaySuccess,
    } = require("../src/cli");
    const ImageGenerator = require("../src/imageGenerator");
    const {
      generateFileName,
      saveImageFile,
      generateUniqueFileName,
    } = require("../src/fileUtils");
    const { formatFileSize } = require("../src/utils");

    // Setup mocks
    parseArguments.mockReturnValue({
      size: 10,
      format: "jpg",
      name: "test",
      output: "./output",
    });

    const mockGenerator = {
      generateImageWithTargetSize: jest.fn().mockReturnValue({
        buffer: Buffer.from("fake-image-data"),
        width: 1920,
        height: 1080,
        actualSizeMB: 9.95,
        iterations: 3,
        format: "jpg",
      }),
    };
    ImageGenerator.mockImplementation(() => mockGenerator);

    generateFileName.mockReturnValue("test.jpg");
    generateUniqueFileName.mockResolvedValue("test.jpg");
    saveImageFile.mockResolvedValue({
      path: "/path/to/test.jpg",
      size: 10485760,
    });
    formatFileSize.mockReturnValue("10.0 MB");

    // Execute main function
    await main();

    // Verify calls
    expect(parseArguments).toHaveBeenCalled();
    expect(mockGenerator.generateImageWithTargetSize).toHaveBeenCalledWith({
      targetSizeMB: 10,
      format: "jpg",
    });
    expect(generateFileName).toHaveBeenCalledWith("test", 10, "jpg");
    expect(saveImageFile).toHaveBeenCalled();
    expect(displaySuccess).toHaveBeenCalled();
  });

  test("应该正确处理CLI验证错误", async () => {
    const {
      parseArguments,
      displayError,
      CLIValidationError,
    } = require("../src/cli");

    const error = new CLIValidationError("测试错误");
    parseArguments.mockImplementation(() => {
      throw error;
    });

    await main();

    expect(displayError).toHaveBeenCalledWith(error);
    expect(mockProcess.exit).toHaveBeenCalledWith(1);
  });

  test("应该正确处理文件系统错误", async () => {
    const { parseArguments, displayError } = require("../src/cli");
    const { FileSystemError } = require("../src/fileUtils");
    const ImageGenerator = require("../src/imageGenerator");

    parseArguments.mockReturnValue({
      size: 10,
      format: "jpg",
      name: null,
      output: ".",
    });

    const mockGenerator = {
      generateImageWithTargetSize: jest.fn().mockReturnValue({
        buffer: Buffer.from("fake-image-data"),
        width: 1920,
        height: 1080,
        actualSizeMB: 9.95,
        iterations: 3,
        format: "jpg",
      }),
    };
    ImageGenerator.mockImplementation(() => mockGenerator);

    const {
      generateFileName,
      saveImageFile,
      generateUniqueFileName,
    } = require("../src/fileUtils");
    generateFileName.mockReturnValue("10MB-2023-01-01-12:00:00.jpg");
    generateUniqueFileName.mockResolvedValue("10MB-2023-01-01-12:00:00.jpg");

    const error = new FileSystemError("磁盘空间不足", "ENOSPC");
    saveImageFile.mockRejectedValue(error);

    await main();

    expect(displayError).toHaveBeenCalledWith(error);
    expect(mockProcess.exit).toHaveBeenCalledWith(2);
  });
});
