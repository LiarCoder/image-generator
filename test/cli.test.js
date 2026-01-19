const {
  CLIValidationError,
  validateFormat,
  validateSize,
  validateName,
  validateOutput,
  parseArguments,
  createCLIProgram,
} = require("../src/cli");

describe("CLI Module", () => {
  describe("validateFormat", () => {
    test("应该接受支持的格式", () => {
      expect(validateFormat("jpg")).toBe("jpg");
      expect(validateFormat("JPG")).toBe("jpg");
      expect(validateFormat("jpeg")).toBe("jpeg");
      expect(validateFormat("JPEG")).toBe("jpeg");
      expect(validateFormat("png")).toBe("png");
      expect(validateFormat("PNG")).toBe("png");
    });

    test("应该拒绝不支持的格式", () => {
      expect(() => validateFormat("gif")).toThrow(CLIValidationError);
      expect(() => validateFormat("bmp")).toThrow(CLIValidationError);
      expect(() => validateFormat("webp")).toThrow(CLIValidationError);
      expect(() => validateFormat("")).toThrow(CLIValidationError);
    });
  });

  describe("validateSize", () => {
    test("应该接受有效的体积值", () => {
      expect(validateSize("10")).toBe(10);
      expect(validateSize("1.5")).toBe(1.5);
      expect(validateSize("25")).toBe(25);
      expect(validateSize("0.1")).toBe(0.1);
    });

    test("应该拒绝无效的体积值", () => {
      expect(() => validateSize("0")).toThrow(CLIValidationError);
      expect(() => validateSize("-5")).toThrow(CLIValidationError);
      expect(() => validateSize("abc")).toThrow(CLIValidationError);
      expect(() => validateSize("")).toThrow(CLIValidationError);
      expect(() => validateSize("1001")).toThrow(CLIValidationError);
    });
  });

  describe("validateName", () => {
    test("应该接受有效的文件名", () => {
      expect(validateName("test-image")).toBe("test-image");
      expect(validateName("my_file")).toBe("my_file");
      expect(validateName("image123")).toBe("image123");
      expect(validateName("  spaced  ")).toBe("spaced");
    });

    test("应该拒绝无效的文件名", () => {
      expect(() => validateName("")).toThrow(CLIValidationError);
      expect(() => validateName("   ")).toThrow(CLIValidationError);
      expect(() => validateName("file<name")).toThrow(CLIValidationError);
      expect(() => validateName("file>name")).toThrow(CLIValidationError);
      expect(() => validateName("file/name")).toThrow(CLIValidationError);
      expect(() => validateName("file\\name")).toThrow(CLIValidationError);
      expect(() => validateName("file|name")).toThrow(CLIValidationError);
      expect(() => validateName("file?name")).toThrow(CLIValidationError);
      expect(() => validateName("file*name")).toThrow(CLIValidationError);
      expect(() => validateName(null)).toThrow(CLIValidationError);
    });
  });

  describe("validateOutput", () => {
    test("应该接受有效的输出路径", () => {
      expect(validateOutput(".")).toBeDefined();
      expect(validateOutput("./output")).toBeDefined();
      expect(validateOutput("/tmp")).toBeDefined();
      expect(validateOutput("  ./test  ")).toBeDefined();
    });

    test("应该拒绝无效的输出路径", () => {
      expect(() => validateOutput("")).toThrow(CLIValidationError);
      expect(() => validateOutput("   ")).toThrow(CLIValidationError);
      expect(() => validateOutput(null)).toThrow(CLIValidationError);
    });
  });

  describe("parseArguments", () => {
    test("应该解析基本的必需参数", () => {
      const argv = ["node", "image-gen", "-s", "10"];
      const options = parseArguments(argv, false);

      expect(options.size).toBe(10);
      expect(options.format).toBe("jpg"); // 默认值
      expect(options.name).toBeNull();
      expect(options.output).toBeDefined();
    });

    test("应该解析所有参数", () => {
      const argv = [
        "node",
        "image-gen",
        "-s",
        "5",
        "-f",
        "png",
        "-n",
        "test-image",
        "-o",
        "./output",
      ];
      const options = parseArguments(argv, false);

      expect(options.size).toBe(5);
      expect(options.format).toBe("png");
      expect(options.name).toBe("test-image");
      expect(options.output).toBeDefined();
    });

    test("应该解析长格式参数", () => {
      const argv = [
        "node",
        "image-gen",
        "--size",
        "15",
        "--format",
        "jpeg",
        "--name",
        "my-image",
        "--output",
        ".",
      ];
      const options = parseArguments(argv, false);

      expect(options.size).toBe(15);
      expect(options.format).toBe("jpeg");
      expect(options.name).toBe("my-image");
      expect(options.output).toBeDefined();
    });

    test("应该在缺少必需参数时抛出错误", () => {
      const argv = ["node", "image-gen"];
      expect(() => parseArguments(argv, false)).toThrow();
    });

    test("应该在参数无效时抛出错误", () => {
      const argv = ["node", "image-gen", "-s", "invalid"];
      expect(() => parseArguments(argv, false)).toThrow(CLIValidationError);
    });
  });

  describe("createCLIProgram", () => {
    test("应该创建Commander程序实例", () => {
      const program = createCLIProgram();
      expect(program).toBeDefined();
      expect(program.name()).toBe("image-gen");
      expect(program.description()).toContain("生成指定体积的图片文件");
    });
  });
});
describe("Error Handling Functions", () => {
  // Mock console methods
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
      log: jest.spyOn(console, "log").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.error.mockRestore();
    consoleSpy.log.mockRestore();
  });

  test("displayError应该正确显示CLI验证错误", () => {
    const { displayError } = require("../src/cli");
    const error = new CLIValidationError("测试错误信息");

    displayError(error);

    expect(consoleSpy.error).toHaveBeenCalledWith("\n❌ 错误:");
    expect(consoleSpy.error).toHaveBeenCalledWith("   测试错误信息");
    expect(consoleSpy.error).toHaveBeenCalledWith(
      "\n💡 提示: 使用 --help 查看使用说明"
    );
  });

  test("displayError应该正确显示普通错误", () => {
    const { displayError } = require("../src/cli");
    const error = new Error("普通错误");

    displayError(error);

    expect(consoleSpy.error).toHaveBeenCalledWith("\n❌ 错误:");
    expect(consoleSpy.error).toHaveBeenCalledWith("   普通错误");
  });

  test("displaySuccess应该正确显示成功信息", () => {
    const { displaySuccess } = require("../src/cli");

    displaySuccess("图片生成成功", {
      filePath: "/path/to/image.jpg",
      fileSize: "10MB",
      dimensions: "1920x1080",
    });

    expect(consoleSpy.log).toHaveBeenCalledWith("\n✅ 成功:");
    expect(consoleSpy.log).toHaveBeenCalledWith("   图片生成成功");
    expect(consoleSpy.log).toHaveBeenCalledWith(
      "   文件路径: /path/to/image.jpg"
    );
    expect(consoleSpy.log).toHaveBeenCalledWith("   文件大小: 10MB");
    expect(consoleSpy.log).toHaveBeenCalledWith("   图片尺寸: 1920x1080");
  });

  test("displayProgress应该正确显示进度信息", () => {
    const { displayProgress } = require("../src/cli");

    displayProgress("正在生成图片");

    expect(consoleSpy.log).toHaveBeenCalledWith("⏳ 正在生成图片...");
  });
});
