// Jimp import - pure JavaScript image processing library
let Jimp;
try {
  Jimp = require("jimp");
} catch (error) {
  // Fallback for environments where jimp is not available
  Jimp = null;
}

/**
 * 图片生成器类
 * 负责创建指定体积和格式的图片
 */
class ImageGenerator {
  constructor() {
    this.supportedFormats = ["jpg", "jpeg", "png"];
  }

  /**
   * 验证图片格式是否支持
   * @param {string} format - 图片格式
   * @returns {boolean} 是否支持该格式
   */
  isFormatSupported(format) {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  /**
   * 验证Jimp库是否可用
   * @throws {Error} 如果Jimp库不可用
   */
  validateJimpAvailability() {
    if (!Jimp) {
      throw new Error(
        "Jimp module is not available. Please install jimp: npm install jimp"
      );
    }
  }

  /**
   * 验证图片尺寸
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   * @throws {Error} 如果尺寸无效
   */
  validateDimensions(width, height) {
    if (width <= 0 || height <= 0) {
      throw new Error("Image dimensions must be positive numbers");
    }

    // Jimp的最大尺寸限制（实际上很宽松，主要受内存限制）
    const maxDimension = 32767; // 保守一些，避免内存问题
    if (width > maxDimension || height > maxDimension) {
      throw new Error(
        `Image dimensions too large: ${width}x${height}. Maximum allowed: ${maxDimension}x${maxDimension}`
      );
    }
  }

  /**
   * 获取MIME类型
   * @param {string} format - 图片格式
   * @returns {string} MIME类型
   */
  getMimeType(format) {
    const formatMap = {
      jpg: Jimp.MIME_JPEG,
      jpeg: Jimp.MIME_JPEG,
      png: Jimp.MIME_PNG,
    };

    return formatMap[format.toLowerCase()] || Jimp.MIME_JPEG;
  }

  /**
   * 解析颜色字符串为Jimp可用的格式
   * @param {string} colorStr - 颜色字符串（如 '#ffffff' 或 'white'）
   * @returns {number} Jimp颜色值（RGBA格式）
   */
  parseColor(colorStr) {
    // 如果是hex颜色
    if (colorStr.startsWith("#")) {
      const hex = colorStr.slice(1);
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        // Jimp使用RGBA格式，A=255表示不透明
        return Jimp.rgbaToInt(r, g, b, 255);
      }
    }

    // 默认白色
    return Jimp.rgbaToInt(255, 255, 255, 255);
  }

  /**
   * 计算合适的字体大小
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   * @param {string} text - 要渲染的文本
   * @returns {number} 字体大小索引（Jimp字体大小）
   */
  calculateFontSize(width, height, text) {
    // 基于图片尺寸选择合适的字体
    const minDimension = Math.min(width, height);

    if (minDimension < 200) {
      return Jimp.FONT_SANS_16_BLACK;
    } else if (minDimension < 500) {
      return Jimp.FONT_SANS_32_BLACK;
    } else if (minDimension < 1000) {
      return Jimp.FONT_SANS_64_BLACK;
    } else {
      return Jimp.FONT_SANS_128_BLACK;
    }
  }

  /**
   * 生成显示文本内容
   * @param {number} sizeMB - 图片体积（MB）
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   * @returns {string} 格式化的显示文本
   */
  generateDisplayText(sizeMB, width, height) {
    return `${sizeMB}MB ${width} × ${height}`;
  }

  /**
   * 生成带文本的图片
   * @param {Object} config - 图片配置
   * @param {number} config.width - 图片宽度
   * @param {number} config.height - 图片高度
   * @param {string} config.format - 图片格式 (jpg, png)
   * @param {number} config.sizeMB - 图片体积（MB）
   * @param {string} [config.backgroundColor='#ffffff'] - 背景颜色
   * @param {string} [config.textColor='#000000'] - 文本颜色
   * @returns {Promise<Buffer>} 图片数据缓冲区
   */
  async generateImageWithText(config) {
    const {
      width,
      height,
      format,
      sizeMB,
      backgroundColor = "#ffffff",
      textColor = "#000000",
      quality = 90,
    } = config;

    // 验证参数
    this.validateJimpAvailability();
    this.validateDimensions(width, height);

    if (!this.isFormatSupported(format)) {
      throw new Error(
        `Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(
          ", "
        )}`
      );
    }

    // 解析背景颜色
    const bgColor = this.parseColor(backgroundColor);

    // 创建图片
    const image = new Jimp(width, height, bgColor);

    // 生成显示文本
    const displayText = this.generateDisplayText(sizeMB, width, height);

    // 选择字体
    const fontType = this.calculateFontSize(width, height, displayText);
    const font = await Jimp.loadFont(fontType);

    // 计算文本位置（居中）
    const textWidth = Jimp.measureText(font, displayText);
    const textHeight = Jimp.measureTextHeight(font, displayText, textWidth);
    const x = (width - textWidth) / 2;
    const y = (height - textHeight) / 2;

    // 绘制文本
    image.print(font, x, y, displayText);

    // 根据格式设置质量并返回缓冲区
    const mimeType = this.getMimeType(format);

    if (format.toLowerCase() === "png") {
      return await image.getBufferAsync(mimeType);
    } else {
      // 对于JPEG，设置质量
      return await image.quality(quality).getBufferAsync(mimeType);
    }
  }

  /**
   * 获取图片缓冲区的实际大小
   * @param {Buffer} buffer - 图片缓冲区
   * @returns {number} 图片大小（字节）
   */
  getImageSize(buffer) {
    return buffer.length;
  }

  /**
   * 将字节转换为MB
   * @param {number} bytes - 字节数
   * @returns {number} MB数值
   */
  bytesToMB(bytes) {
    return bytes / (1024 * 1024);
  }

  /**
   * 将MB转换为字节
   * @param {number} mb - MB数值
   * @returns {number} 字节数
   */
  mbToBytes(mb) {
    return mb * 1024 * 1024;
  }

  /**
   * 估算初始图片尺寸
   * @param {number} targetSizeBytes - 目标体积（字节）
   * @param {string} format - 图片格式
   * @returns {Object} 估算的宽度和高度
   */
  estimateInitialDimensions(targetSizeBytes, format) {
    // Jimp的最大尺寸限制
    const maxDimension = 32767;

    // 不同格式的压缩率系数（基于Jimp的实际表现调整）
    const compressionFactors = {
      jpg: 1.5, // JPEG在Jimp中的压缩效果，每像素约1.5字节
      jpeg: 1.5,
      png: 1.2, // PNG在Jimp中实际压缩效果比预期好，调整为1.2字节每像素
    };

    const factor = compressionFactors[format.toLowerCase()] || 1.5;

    // 估算像素数量
    let estimatedPixels = targetSizeBytes / factor;

    // 使用16:9的宽高比
    const aspectRatio = 16 / 9;
    let width = Math.sqrt(estimatedPixels * aspectRatio);
    let height = estimatedPixels / width;

    // 检查是否超过最大尺寸限制
    if (width > maxDimension || height > maxDimension) {
      // 如果超过限制，使用最大允许尺寸
      if (width > height) {
        width = maxDimension;
        height = maxDimension / aspectRatio;
      } else {
        height = maxDimension;
        width = maxDimension * aspectRatio;
      }

      // 确保两个维度都不超过限制
      width = Math.min(width, maxDimension);
      height = Math.min(height, maxDimension);
    }

    // 确保最小尺寸
    width = Math.max(Math.round(width), 100);
    height = Math.max(Math.round(height), 56);

    return {
      width,
      height,
    };
  }

  /**
   * 调整图片尺寸以达到目标体积
   * @param {number} currentSize - 当前图片体积（字节）
   * @param {number} targetSize - 目标体积（字节）
   * @param {number} currentWidth - 当前宽度
   * @param {number} currentHeight - 当前高度
   * @returns {Object} 调整后的宽度和高度
   */
  adjustDimensions(currentSize, targetSize, currentWidth, currentHeight) {
    // 计算缩放比例
    const sizeRatio = targetSize / currentSize;
    const scaleFactor = Math.sqrt(sizeRatio);

    // 应用缩放比例
    const newWidth = Math.round(currentWidth * scaleFactor);
    const newHeight = Math.round(currentHeight * scaleFactor);

    // 确保尺寸不会太小
    return {
      width: Math.max(newWidth, 50),
      height: Math.max(newHeight, 50),
    };
  }

  /**
   * 检查体积是否在允许误差范围内
   * @param {number} actualSize - 实际体积（字节）
   * @param {number} targetSize - 目标体积（字节）
   * @param {number} [tolerance=0.05] - 允许误差比例（默认5%）
   * @returns {boolean} 是否在误差范围内
   */
  isWithinTolerance(actualSize, targetSize, tolerance = 0.05) {
    const difference = Math.abs(actualSize - targetSize);
    const allowedDifference = targetSize * tolerance;
    return difference < allowedDifference;
  }

  /**
   * 生成指定体积的图片（核心算法）
   * @param {Object} config - 图片配置
   * @param {number} config.targetSizeMB - 目标体积（MB）
   * @param {string} config.format - 图片格式
   * @param {string} [config.backgroundColor='#ffffff'] - 背景颜色
   * @param {string} [config.textColor='#000000'] - 文本颜色
   * @param {number} [config.maxIterations=20] - 最大迭代次数
   * @param {number} [config.tolerance=0.05] - 允许误差比例
   * @returns {Promise<Object>} 生成的图片信息
   */
  async generateImageWithTargetSize(config) {
    const {
      targetSizeMB,
      format,
      backgroundColor = "#ffffff",
      textColor = "#000000",
      maxIterations = 20,
      tolerance = 0.05,
    } = config;

    // 验证参数
    if (targetSizeMB <= 0) {
      throw new Error("Target size must be greater than 0");
    }

    if (!this.isFormatSupported(format)) {
      throw new Error(
        `Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(
          ", "
        )}`
      );
    }

    const targetSizeBytes = this.mbToBytes(targetSizeMB);
    const maxDimension = 32767;

    // 估算初始尺寸
    let { width, height } = this.estimateInitialDimensions(
      targetSizeBytes,
      format
    );

    let iteration = 0;
    let buffer;
    let actualSize;
    let quality = 90; // 初始质量

    // 迭代调整尺寸直到达到目标体积
    while (iteration < maxIterations) {
      // 检查尺寸是否超过限制
      if (width > maxDimension || height > maxDimension) {
        // 如果尺寸超过限制，使用最大允许尺寸，并通过调整质量来达到目标体积
        const aspectRatio = width / height;
        if (width > height) {
          width = maxDimension;
          height = Math.round(maxDimension / aspectRatio);
        } else {
          height = maxDimension;
          width = Math.round(maxDimension * aspectRatio);
        }

        // 确保两个维度都不超过限制
        width = Math.min(width, maxDimension);
        height = Math.min(height, maxDimension);

        // 对于JPEG格式，可以通过调整质量来控制文件大小
        if (format.toLowerCase() === "jpg" || format.toLowerCase() === "jpeg") {
          // 估算需要的质量
          const pixelCount = width * height;
          const bytesPerPixel = targetSizeBytes / pixelCount;

          // 根据每像素字节数调整质量
          if (bytesPerPixel > 2) {
            quality = 100;
          } else if (bytesPerPixel > 1.5) {
            quality = 95;
          } else if (bytesPerPixel > 1) {
            quality = 90;
          } else if (bytesPerPixel > 0.5) {
            quality = 80;
          } else {
            quality = 70;
          }
        }
      }

      // 生成图片
      buffer = await this.generateImageWithText({
        width,
        height,
        format,
        sizeMB: targetSizeMB,
        backgroundColor,
        textColor,
        quality,
      });

      actualSize = this.getImageSize(buffer);

      // 检查是否在误差范围内
      if (this.isWithinTolerance(actualSize, targetSizeBytes, tolerance)) {
        break;
      }

      // 如果尺寸已经达到最大限制，通过调整质量来控制文件大小
      if (
        (width >= maxDimension || height >= maxDimension) &&
        (format.toLowerCase() === "jpg" || format.toLowerCase() === "jpeg")
      ) {
        if (actualSize < targetSizeBytes) {
          // 文件太小，提高质量
          quality = Math.min(100, quality + 5);
        } else {
          // 文件太大，降低质量
          quality = Math.max(10, quality - 5);
        }
      } else {
        // 正常的尺寸调整
        const newDimensions = this.adjustDimensions(
          actualSize,
          targetSizeBytes,
          width,
          height
        );
        width = newDimensions.width;
        height = newDimensions.height;
      }

      iteration++;
    }

    // 如果达到最大迭代次数仍未收敛，发出警告但仍返回结果
    if (iteration >= maxIterations) {
      console.warn(
        `Warning: Reached maximum iterations (${maxIterations}). Final size may not be exact.`
      );
    }

    return {
      buffer,
      width,
      height,
      actualSizeBytes: actualSize,
      actualSizeMB: this.bytesToMB(actualSize),
      targetSizeMB,
      iterations: iteration + 1,
      format,
      quality:
        format.toLowerCase() === "jpg" || format.toLowerCase() === "jpeg"
          ? quality
          : undefined,
    };
  }
}

module.exports = ImageGenerator;
