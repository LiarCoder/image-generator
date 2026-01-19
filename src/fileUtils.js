const fs = require("fs").promises;
const path = require("path");
const { generateDefaultName } = require("./utils");

/**
 * 文件系统错误类
 */
class FileSystemError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "FileSystemError";
    this.code = code;
  }
}

/**
 * 文件名验证错误类
 */
class FileNameValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FileNameValidationError";
  }
}

/**
 * 验证文件名是否合法
 * @param {string} filename - 文件名
 * @returns {boolean} - 是否合法
 */
function validateFileName(filename) {
  if (!filename || typeof filename !== "string") {
    return false;
  }

  // 检查非法字符 (移除冒号，因为时间戳中会用到)
  const invalidChars = /[<>"/\\|?*]/;
  if (invalidChars.test(filename)) {
    return false;
  }

  // 检查保留名称
  const reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];
  const nameWithoutExt = path.parse(filename).name.toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return false;
  }

  return true;
}

/**
 * 处理文件名，确保扩展名正确
 * @param {string} filename - 原始文件名
 * @param {string} format - 图片格式 (jpg, png)
 * @returns {string} - 处理后的文件名
 */
function processFileName(filename, format) {
  if (!validateFileName(filename)) {
    throw new FileNameValidationError(`无效的文件名: ${filename}`);
  }

  const ext = `.${format.toLowerCase()}`;
  const parsedPath = path.parse(filename);

  // 如果已有扩展名且正确，直接返回
  if (parsedPath.ext.toLowerCase() === ext) {
    return filename;
  }

  // 添加或替换扩展名
  return parsedPath.name + ext;
}
/**
 * 确保输出目录存在
 * @param {string} outputDir - 输出目录路径
 */
async function ensureOutputDirectory(outputDir) {
  try {
    await fs.access(outputDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        await fs.mkdir(outputDir, { recursive: true });
      } catch (mkdirError) {
        throw new FileSystemError(
          `无法创建输出目录: ${outputDir}`,
          mkdirError.code
        );
      }
    } else {
      throw new FileSystemError(`无法访问输出目录: ${outputDir}`, error.code);
    }
  }
}

/**
 * 检查文件写入权限
 * @param {string} filePath - 文件路径
 */
async function checkWritePermission(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir, fs.constants.W_OK);
  } catch (error) {
    throw new FileSystemError(`没有写入权限: ${dir}`, error.code);
  }
}

/**
 * 保存图片文件
 * @param {Buffer} imageBuffer - 图片数据
 * @param {string} filename - 文件名
 * @param {string} outputDir - 输出目录，默认为当前目录
 * @returns {Promise<{name: string, path: string, size: number}>} - 文件信息
 */
async function saveImageFile(imageBuffer, filename, outputDir = ".") {
  try {
    // 确保输出目录存在
    await ensureOutputDirectory(outputDir);

    // 构建完整文件路径
    const fullPath = path.resolve(outputDir, filename);

    // 检查写入权限
    await checkWritePermission(fullPath);

    // 检查磁盘空间（简单检查）
    const stats = await fs.stat(outputDir);
    if (!stats.isDirectory()) {
      throw new FileSystemError(`输出路径不是目录: ${outputDir}`, "ENOTDIR");
    }

    // 保存文件
    await fs.writeFile(fullPath, imageBuffer);

    // 获取文件信息
    const fileStats = await fs.stat(fullPath);

    return {
      name: filename,
      path: fullPath,
      size: fileStats.size,
    };
  } catch (error) {
    if (
      error instanceof FileSystemError ||
      error instanceof FileNameValidationError
    ) {
      throw error;
    }

    // 处理其他文件系统错误
    switch (error.code) {
      case "ENOSPC":
        throw new FileSystemError("磁盘空间不足", error.code);
      case "EACCES":
        throw new FileSystemError("没有文件写入权限", error.code);
      case "EEXIST":
        throw new FileSystemError("文件已存在", error.code);
      default:
        throw new FileSystemError(`文件保存失败: ${error.message}`, error.code);
    }
  }
}

/**
 * 生成最终的文件名
 * 处理用户自定义文件名和默认文件名生成
 * @param {string|null} userFileName - 用户指定的文件名（可选）
 * @param {number} sizeMB - 图片体积（MB）
 * @param {string} format - 图片格式
 * @returns {string} 最终的文件名（包含扩展名）
 */
function generateFileName(userFileName, sizeMB, format) {
  let baseName;

  if (userFileName && userFileName.trim()) {
    // 用户指定了文件名
    baseName = userFileName.trim();
  } else {
    // 使用默认文件名生成规则
    baseName = generateDefaultName(sizeMB);
  }

  // 处理文件名，确保扩展名正确
  return processFileName(baseName, format);
}

/**
 * 检查文件是否已存在
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>} - 文件是否存在
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 生成唯一的文件名（如果文件已存在，添加数字后缀）
 * @param {string} fileName - 原始文件名
 * @param {string} outputDir - 输出目录
 * @returns {Promise<string>} - 唯一的文件名
 */
async function generateUniqueFileName(fileName, outputDir = ".") {
  const fullPath = path.resolve(outputDir, fileName);

  if (!(await fileExists(fullPath))) {
    return fileName;
  }

  const parsedPath = path.parse(fileName);
  let counter = 1;

  while (true) {
    const newFileName = `${parsedPath.name}(${counter})${parsedPath.ext}`;
    const newFullPath = path.resolve(outputDir, newFileName);

    if (!(await fileExists(newFullPath))) {
      return newFileName;
    }

    counter++;

    // 防止无限循环
    if (counter > 9999) {
      throw new FileSystemError("无法生成唯一文件名，请检查输出目录");
    }
  }
}

module.exports = {
  FileSystemError,
  FileNameValidationError,
  validateFileName,
  processFileName,
  ensureOutputDirectory,
  checkWritePermission,
  saveImageFile,
  generateFileName,
  fileExists,
  generateUniqueFileName,
};
