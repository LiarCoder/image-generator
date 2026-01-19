const { Command } = require("commander");
const path = require("path");

/**
 * CLI参数验证错误类
 */
class CLIValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CLIValidationError";
  }
}

/**
 * 验证图片格式
 * @param {string} format - 图片格式
 * @returns {string} 验证后的格式
 */
function validateFormat(format) {
  const supportedFormats = ["jpg", "jpeg", "png"];
  const normalizedFormat = format.toLowerCase();

  if (!supportedFormats.includes(normalizedFormat)) {
    throw new CLIValidationError(
      `不支持的图片格式: ${format}。支持的格式: ${supportedFormats.join(", ")}`
    );
  }

  return normalizedFormat;
}

/**
 * 验证图片体积
 * @param {string} sizeStr - 体积字符串
 * @returns {number} 验证后的体积数值
 */
function validateSize(sizeStr) {
  const size = parseFloat(sizeStr);

  if (isNaN(size)) {
    throw new CLIValidationError(`无效的体积值: ${sizeStr}，必须是数字`);
  }

  if (size <= 0) {
    throw new CLIValidationError(`体积必须大于0，当前值: ${size}`);
  }

  if (size > 25) {
    throw new CLIValidationError(`体积过大: ${size}MB，最大支持25MB`);
  }

  return size;
}

/**
 * 验证文件名
 * @param {string} name - 文件名
 * @returns {string} 验证后的文件名
 */
function validateName(name) {
  if (!name || typeof name !== "string") {
    throw new CLIValidationError("文件名不能为空");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new CLIValidationError("文件名不能为空");
  }

  // 检查非法字符
  const invalidChars = /[<>"/\\|?*]/;
  if (invalidChars.test(trimmedName)) {
    throw new CLIValidationError(
      `文件名包含非法字符: ${trimmedName}。不能包含: < > " / \\ | ? *`
    );
  }

  return trimmedName;
}

/**
 * 验证输出目录
 * @param {string} outputPath - 输出目录路径
 * @returns {string} 验证后的输出目录路径
 */
function validateOutput(outputPath) {
  if (!outputPath || typeof outputPath !== "string") {
    throw new CLIValidationError("输出目录不能为空");
  }

  const trimmedPath = outputPath.trim();
  if (!trimmedPath) {
    throw new CLIValidationError("输出目录不能为空");
  }

  // 解析为绝对路径
  const resolvedPath = path.resolve(trimmedPath);

  return resolvedPath;
}

/**
 * 创建CLI程序实例
 * @returns {Command} Commander程序实例
 */
function createCLIProgram() {
  const program = new Command();

  program
    .name("image-gen")
    .description(
      "生成指定体积的图片文件的命令行工具\n\n" +
        "这个工具可以生成指定体积大小的图片文件，支持JPG和PNG格式。\n" +
        "生成的图片会在中央显示体积和尺寸信息。"
    )
    .version("1.0.0", "-v, --version", "显示版本号")
    .helpOption("-h, --help", "显示帮助信息");

  // 必需参数：体积
  program.requiredOption(
    "-s, --size <size>",
    "图片体积大小（MB），必须大于0，最大支持25MB",
    validateSize
  );

  // 可选参数：格式
  program.option(
    "-f, --format <format>",
    "图片格式，支持: jpg, jpeg, png（默认: jpg）",
    validateFormat,
    "jpg"
  );

  // 可选参数：文件名
  program.option(
    "-n, --name <name>",
    "自定义文件名（不包含扩展名），如未指定则自动生成",
    validateName
  );

  // 可选参数：输出目录
  program.option(
    "-o, --output <path>",
    "输出目录路径（默认: 当前目录）",
    validateOutput,
    process.cwd()
  );

  // 添加使用示例
  program.addHelpText(
    "after",
    `
使用示例:
  $ image-gen -s 10                           # 生成10MB的JPG图片
  $ image-gen -s 5 -f png                     # 生成5MB的PNG图片
  $ image-gen -s 20 -n my-image               # 生成20MB图片，指定文件名
  $ image-gen -s 15 -f jpeg -o ./output       # 生成15MB JPEG图片到指定目录
  $ image-gen -s 1.5 -f png -n test -o ./img  # 完整参数示例

注意事项:
  - 体积单位为MB，支持小数（如1.5）
  - 文件名不需要包含扩展名，会自动添加
  - 如果文件已存在，会自动添加数字后缀
  - 生成的图片中央会显示体积和尺寸信息
`
  );

  return program;
}

/**
 * 解析命令行参数
 * @param {string[]} argv - 命令行参数数组
 * @param {boolean} exitOnError - 是否在错误时退出进程（默认true）
 * @returns {Object} 解析后的选项对象
 */
function parseArguments(argv = process.argv, exitOnError = true) {
  const program = createCLIProgram();

  // 在测试环境中禁用自动退出
  if (!exitOnError) {
    program.exitOverride();
  }

  try {
    program.parse(argv);
    const options = program.opts();

    // 返回标准化的选项对象
    return {
      size: options.size,
      format: options.format,
      name: options.name || null,
      output: options.output,
    };
  } catch (error) {
    if (error instanceof CLIValidationError) {
      throw error;
    }

    // 处理Commander.js的错误
    if (error.code === "commander.missingMandatoryOptionValue") {
      throw new CLIValidationError("缺少必需的参数值");
    }

    if (error.code === "commander.unknownOption") {
      throw new CLIValidationError(`未知的选项: ${error.message}`);
    }

    if (error.code === "commander.missingArgument") {
      throw new CLIValidationError("缺少必需的参数");
    }

    // 重新抛出其他错误
    throw error;
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  const program = createCLIProgram();
  program.help();
}

/**
 * 显示版本信息
 */
function showVersion() {
  const program = createCLIProgram();
  console.log(program.version());
}

/**
 * 显示使用示例
 */
function showExamples() {
  console.log("使用示例:");
  console.log("");
  console.log("  # 生成10MB的JPG图片");
  console.log("  image-gen -s 10");
  console.log("");
  console.log("  # 生成5MB的PNG图片，指定文件名");
  console.log("  image-gen -s 5 -f png -n my-image");
  console.log("");
  console.log("  # 生成20MB的图片，保存到指定目录");
  console.log("  image-gen -s 20 -o ./output");
  console.log("");
  console.log("  # 生成1.5MB的JPEG图片，完整参数");
  console.log("  image-gen -s 1.5 -f jpeg -n test-image -o ./images");
  console.log("");
}

/**
 * 格式化错误信息并显示
 * @param {Error} error - 错误对象
 */
function displayError(error) {
  console.error("\n❌ 错误:");

  if (error instanceof CLIValidationError) {
    console.error(`   ${error.message}`);
    console.error("\n💡 提示: 使用 --help 查看使用说明");
  } else {
    console.error(`   ${error.message}`);
  }

  console.error("");
}

/**
 * 显示成功信息
 * @param {string} message - 成功信息
 * @param {Object} details - 详细信息
 */
function displaySuccess(message, details = {}) {
  console.log("\n✅ 成功:");
  console.log(`   ${message}`);

  if (details.filePath) {
    console.log(`   文件路径: ${details.filePath}`);
  }

  if (details.fileSize) {
    console.log(`   文件大小: ${details.fileSize}`);
  }

  if (details.dimensions) {
    console.log(`   图片尺寸: ${details.dimensions}`);
  }

  console.log("");
}

/**
 * 显示进度信息
 * @param {string} message - 进度信息
 */
function displayProgress(message) {
  console.log(`⏳ ${message}...`);
}

module.exports = {
  CLIValidationError,
  validateFormat,
  validateSize,
  validateName,
  validateOutput,
  createCLIProgram,
  parseArguments,
  showHelp,
  showVersion,
  showExamples,
  displayError,
  displaySuccess,
  displayProgress,
};
