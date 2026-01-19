/**
 * 工具函数模块测试
 */

const {
  generateDefaultName,
  formatFileSize,
  calculateDimensions,
} = require("../src/utils");

describe("工具函数模块", () => {
  describe("generateDefaultName", () => {
    test("应该生成正确格式的默认文件名", () => {
      const sizeMB = 10;
      const result = generateDefaultName(sizeMB);

      // 验证格式: ${体积}MB-YYYY-MM-DD-HH_mm_ss (使用下划线替代冒号)
      const pattern = /^10MB-\d{4}-\d{2}-\d{2}-\d{2}_\d{2}_\d{2}$/;
      expect(result).toMatch(pattern);
    });

    test("应该包含正确的体积信息", () => {
      const sizeMB = 25;
      const result = generateDefaultName(sizeMB);

      expect(result.startsWith("25MB-")).toBe(true);
    });

    test("应该生成当前时间戳", () => {
      const sizeMB = 5;
      const beforeTime = new Date();
      const result = generateDefaultName(sizeMB);
      const afterTime = new Date();

      // 验证时间戳在合理范围内（允许几秒误差）
      expect(result).toContain(beforeTime.getFullYear().toString());
      expect(result).toContain(
        String(beforeTime.getMonth() + 1).padStart(2, "0")
      );
      expect(result).toContain(String(beforeTime.getDate()).padStart(2, "0"));

      // 验证使用下划线而不是冒号
      expect(result).toMatch(/_\d{2}_\d{2}$/);
    });

    test("应该处理小数体积", () => {
      const sizeMB = 1.5;
      const result = generateDefaultName(sizeMB);

      expect(result.startsWith("1.5MB-")).toBe(true);
    });

    test("应该在无效输入时抛出错误", () => {
      expect(() => generateDefaultName(0)).toThrow("体积必须是大于0的数字");
      expect(() => generateDefaultName(-1)).toThrow("体积必须是大于0的数字");
      expect(() => generateDefaultName("invalid")).toThrow(
        "体积必须是大于0的数字"
      );
      expect(() => generateDefaultName(null)).toThrow("体积必须是大于0的数字");
    });
  });

  describe("formatFileSize", () => {
    test("应该正确格式化字节数", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1024)).toBe("1.00 KB");
      expect(formatFileSize(1536)).toBe("1.50 KB");
    });

    test("应该正确格式化KB", () => {
      expect(formatFileSize(1024)).toBe("1.00 KB");
      expect(formatFileSize(2048)).toBe("2.00 KB");
      expect(formatFileSize(1536)).toBe("1.50 KB");
    });

    test("应该正确格式化MB", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.50 MB");
      expect(formatFileSize(1024 * 1024 * 10)).toBe("10.00 MB");
    });

    test("应该正确格式化GB", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
      expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe("1.50 GB");
    });

    test("应该正确格式化TB", () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 2.5)).toBe("2.50 TB");
    });

    test("应该处理非常大的数值", () => {
      const veryLargeBytes = 1024 * 1024 * 1024 * 1024 * 1024; // 1 PB
      const result = formatFileSize(veryLargeBytes);
      expect(result).toContain("TB"); // 应该显示为TB，因为我们只支持到TB
    });

    test("应该在无效输入时抛出错误", () => {
      expect(() => formatFileSize(-1)).toThrow("字节数必须是非负数字");
      expect(() => formatFileSize("invalid")).toThrow("字节数必须是非负数字");
      expect(() => formatFileSize(null)).toThrow("字节数必须是非负数字");
    });

    test("应该处理边界情况", () => {
      expect(formatFileSize(1023)).toBe("1023 B");
      expect(formatFileSize(1025)).toBe("1.00 KB");
      expect(formatFileSize(1024 * 1023)).toBe("1023.00 KB");
      expect(formatFileSize(1024 * 1025)).toBe("1.00 MB");
    });
  });

  describe("calculateDimensions", () => {
    test("应该为JPG格式计算正确的尺寸", () => {
      // 10MB = 10 * 1024 * 1024 bytes
      const targetSize = 10 * 1024 * 1024;
      const result = calculateDimensions(targetSize, "jpg");

      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
      expect(typeof result.width).toBe("number");
      expect(typeof result.height).toBe("number");
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // 验证宽高比接近16:9
      const aspectRatio = result.width / result.height;
      expect(aspectRatio).toBeCloseTo(16 / 9, 1);
    });

    test("应该为PNG格式计算正确的尺寸", () => {
      const targetSize = 5 * 1024 * 1024; // 5MB
      const result = calculateDimensions(targetSize, "png");

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // PNG压缩率较低，相同体积下尺寸应该比JPG小
      const jpgResult = calculateDimensions(targetSize, "jpg");
      expect(result.width).toBeLessThan(jpgResult.width);
      expect(result.height).toBeLessThan(jpgResult.height);
    });

    test("应该处理JPEG格式（与JPG相同）", () => {
      const targetSize = 2 * 1024 * 1024; // 2MB
      const jpgResult = calculateDimensions(targetSize, "jpg");
      const jpegResult = calculateDimensions(targetSize, "jpeg");

      expect(jpegResult.width).toBe(jpgResult.width);
      expect(jpegResult.height).toBe(jpgResult.height);
    });

    test("应该使用默认格式JPG", () => {
      const targetSize = 1 * 1024 * 1024; // 1MB
      const defaultResult = calculateDimensions(targetSize);
      const jpgResult = calculateDimensions(targetSize, "jpg");

      expect(defaultResult.width).toBe(jpgResult.width);
      expect(defaultResult.height).toBe(jpgResult.height);
    });

    test("应该处理不区分大小写的格式", () => {
      const targetSize = 3 * 1024 * 1024; // 3MB
      const lowerResult = calculateDimensions(targetSize, "jpg");
      const upperResult = calculateDimensions(targetSize, "JPG");
      const mixedResult = calculateDimensions(targetSize, "JpG");

      expect(upperResult.width).toBe(lowerResult.width);
      expect(upperResult.height).toBe(lowerResult.height);
      expect(mixedResult.width).toBe(lowerResult.width);
      expect(mixedResult.height).toBe(lowerResult.height);
    });

    test("应该确保最小尺寸", () => {
      // 非常小的目标体积
      const smallSize = 1000; // 1KB
      const result = calculateDimensions(smallSize, "jpg");

      expect(result.width).toBeGreaterThanOrEqual(100);
      expect(result.height).toBeGreaterThanOrEqual(56);
    });

    test("应该处理大体积图片", () => {
      const largeSize = 100 * 1024 * 1024; // 100MB
      const result = calculateDimensions(largeSize, "jpg");

      expect(result.width).toBeGreaterThan(1000);
      expect(result.height).toBeGreaterThan(500);

      // 验证计算结果是合理的
      const aspectRatio = result.width / result.height;
      expect(aspectRatio).toBeCloseTo(16 / 9, 1);
    });

    test("应该在无效输入时抛出错误", () => {
      expect(() => calculateDimensions(0)).toThrow("目标体积必须是大于0的数字");
      expect(() => calculateDimensions(-1)).toThrow(
        "目标体积必须是大于0的数字"
      );
      expect(() => calculateDimensions("invalid")).toThrow(
        "目标体积必须是大于0的数字"
      );
      expect(() => calculateDimensions(null)).toThrow(
        "目标体积必须是大于0的数字"
      );
    });

    test("应该在无效格式时抛出错误", () => {
      const targetSize = 1024 * 1024;

      expect(() => calculateDimensions(targetSize, 123)).toThrow(
        "格式必须是字符串"
      );
      expect(() => calculateDimensions(targetSize, null)).toThrow(
        "格式必须是字符串"
      );
      expect(() => calculateDimensions(targetSize, "bmp")).toThrow(
        "不支持的图片格式，仅支持 jpg、jpeg、png"
      );
      expect(() => calculateDimensions(targetSize, "gif")).toThrow(
        "不支持的图片格式，仅支持 jpg、jpeg、png"
      );
    });

    test("应该验证压缩率系数的正确性", () => {
      const targetSize = 10 * 1024 * 1024; // 10MB

      const jpgResult = calculateDimensions(targetSize, "jpg");
      const pngResult = calculateDimensions(targetSize, "png");

      // JPG压缩率更高，相同体积下应该有更大的尺寸
      expect(jpgResult.width * jpgResult.height).toBeGreaterThan(
        pngResult.width * pngResult.height
      );

      // 验证像素数与压缩率的关系
      const jpgPixels = jpgResult.width * jpgResult.height;
      const pngPixels = pngResult.width * pngResult.height;

      // JPG每像素0.5字节，PNG每像素2字节，所以JPG像素数应该约为PNG的4倍
      const ratio = jpgPixels / pngPixels;
      expect(ratio).toBeCloseTo(4, 0.5);
    });

    test("应该返回整数尺寸", () => {
      const targetSize = 7.5 * 1024 * 1024; // 7.5MB
      const result = calculateDimensions(targetSize, "jpg");

      expect(Number.isInteger(result.width)).toBe(true);
      expect(Number.isInteger(result.height)).toBe(true);
    });
  });
});
