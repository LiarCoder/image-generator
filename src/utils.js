/**
 * 工具函数模块
 * 提供通用的工具函数，包括文件名生成、文件大小格式化等
 */

/**
 * 生成默认文件名格式
 * 格式: ${体积}MB-${时间戳}
 * 时间戳格式: YYYY-MM-DD-HH_mm_ss (使用下划线替代冒号以兼容Windows)
 *
 * @param {number} sizeMB - 图片体积（MB）
 * @returns {string} 生成的默认文件名（不包含扩展名）
 */
function generateDefaultName(sizeMB) {
  if (typeof sizeMB !== "number" || sizeMB <= 0) {
    throw new Error("体积必须是大于0的数字");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const timestamp = `${year}-${month}-${day}-${hours}_${minutes}_${seconds}`;
  return `${sizeMB}MB-${timestamp}`;
}

/**
 * 格式化文件大小显示
 * 将字节数转换为人类可读的格式
 *
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的文件大小字符串
 */
function formatFileSize(bytes) {
  if (typeof bytes !== "number" || bytes < 0) {
    throw new Error("字节数必须是非负数字");
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (i >= units.length) {
    return `${(bytes / Math.pow(k, units.length - 1)).toFixed(2)} ${
      units[units.length - 1]
    }`;
  }

  const size = bytes / Math.pow(k, i);
  const decimals = i === 0 ? 0 : 2;

  return `${size.toFixed(decimals)} ${units[i]}`;
}

/**
 * 根据目标体积估算图片尺寸
 * 考虑不同格式的压缩率系数来计算合适的图片尺寸
 *
 * @param {number} targetSizeBytes - 目标文件大小（字节）
 * @param {string} format - 图片格式 ('jpg', 'png')
 * @returns {{width: number, height: number}} 计算出的图片尺寸
 */
function calculateDimensions(targetSizeBytes, format = "jpg") {
  if (typeof targetSizeBytes !== "number" || targetSizeBytes <= 0) {
    throw new Error("目标体积必须是大于0的数字");
  }

  if (typeof format !== "string") {
    throw new Error("格式必须是字符串");
  }

  const normalizedFormat = format.toLowerCase();
  if (!["jpg", "jpeg", "png"].includes(normalizedFormat)) {
    throw new Error("不支持的图片格式，仅支持 jpg、jpeg、png");
  }

  // 不同格式的压缩率系数（每像素字节数的估算）
  // 这些系数基于典型的图片压缩情况
  const compressionRatios = {
    jpg: 0.5, // JPG压缩率较高，每像素约0.5字节
    jpeg: 0.5, // JPEG与JPG相同
    png: 2.0, // PNG压缩率较低，每像素约2字节
  };

  const bytesPerPixel = compressionRatios[normalizedFormat];

  // 估算总像素数
  const estimatedPixels = targetSizeBytes / bytesPerPixel;

  // 使用16:9的宽高比作为默认比例
  const aspectRatio = 16 / 9;

  // 根据宽高比计算尺寸
  // width * height = estimatedPixels
  // width / height = aspectRatio
  // 因此: width = sqrt(estimatedPixels * aspectRatio)
  const width = Math.round(Math.sqrt(estimatedPixels * aspectRatio));
  const height = Math.round(estimatedPixels / width);

  // 确保最小尺寸
  const minWidth = Math.max(width, 100);
  const minHeight = Math.max(height, 56); // 保持16:9比例的最小高度

  return {
    width: minWidth,
    height: minHeight,
  };
}

module.exports = {
  generateDefaultName,
  formatFileSize,
  calculateDimensions,
};
