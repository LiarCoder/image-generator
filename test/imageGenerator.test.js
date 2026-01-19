// Mock canvas module
jest.mock("canvas", () => ({
  createCanvas: jest.fn((width, height) => ({
    width,
    height,
    getContext: jest.fn(() => ({
      fillStyle: "",
      fillRect: jest.fn(),
      font: "",
      textAlign: "",
      textBaseline: "",
      fillText: jest.fn(),
    })),
    toBuffer: jest.fn((mimeType) => {
      // Return a mock buffer with some size based on dimensions
      const mockSize = Math.floor(width * height * 0.1); // Simulate compression
      return Buffer.alloc(mockSize, "mock-image-data");
    }),
  })),
}));

const ImageGenerator = require("../src/imageGenerator");

describe("ImageGenerator", () => {
  let generator;

  beforeEach(() => {
    generator = new ImageGenerator();
  });

  describe("Constructor and basic properties", () => {
    test("should initialize with supported formats", () => {
      expect(generator.supportedFormats).toEqual(["jpg", "jpeg", "png"]);
    });
  });

  describe("isFormatSupported", () => {
    test("should return true for supported formats", () => {
      expect(generator.isFormatSupported("jpg")).toBe(true);
      expect(generator.isFormatSupported("jpeg")).toBe(true);
      expect(generator.isFormatSupported("png")).toBe(true);
      expect(generator.isFormatSupported("JPG")).toBe(true); // case insensitive
    });

    test("should return false for unsupported formats", () => {
      expect(generator.isFormatSupported("gif")).toBe(false);
      expect(generator.isFormatSupported("bmp")).toBe(false);
      expect(generator.isFormatSupported("webp")).toBe(false);
    });
  });

  describe("createCanvasInstance", () => {
    test("should create canvas with correct dimensions", () => {
      const { canvas, ctx } = generator.createCanvasInstance(800, 600);

      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      expect(ctx).toBeDefined();
    });

    test("should throw error for invalid dimensions", () => {
      expect(() => generator.createCanvasInstance(0, 600)).toThrow(
        "Canvas dimensions must be positive numbers"
      );
      expect(() => generator.createCanvasInstance(800, 0)).toThrow(
        "Canvas dimensions must be positive numbers"
      );
      expect(() => generator.createCanvasInstance(-100, 600)).toThrow(
        "Canvas dimensions must be positive numbers"
      );
    });
  });

  describe("getMimeType", () => {
    test("should return correct MIME types", () => {
      expect(generator.getMimeType("jpg")).toBe("image/jpeg");
      expect(generator.getMimeType("jpeg")).toBe("image/jpeg");
      expect(generator.getMimeType("png")).toBe("image/png");
      expect(generator.getMimeType("JPG")).toBe("image/jpeg"); // case insensitive
    });

    test("should return default MIME type for unknown formats", () => {
      expect(generator.getMimeType("unknown")).toBe("image/jpeg");
    });
  });

  describe("generateBasicImage", () => {
    test("should generate JPG image with correct format", () => {
      const config = {
        width: 100,
        height: 100,
        format: "jpg",
      };

      const buffer = generator.generateBasicImage(config);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test("should generate PNG image with correct format", () => {
      const config = {
        width: 100,
        height: 100,
        format: "png",
      };

      const buffer = generator.generateBasicImage(config);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test("should throw error for unsupported format", () => {
      const config = {
        width: 100,
        height: 100,
        format: "gif",
      };

      expect(() => generator.generateBasicImage(config)).toThrow(
        "Unsupported format: gif"
      );
    });

    test("should use custom background color", () => {
      const config = {
        width: 100,
        height: 100,
        format: "jpg",
        backgroundColor: "#ff0000",
      };

      const buffer = generator.generateBasicImage(config);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  describe("Text rendering functionality", () => {
    test("calculateFontSize should return appropriate font size", () => {
      // Test basic calculation
      expect(generator.calculateFontSize(400, 300, "Test")).toBe(15); // min(400,300)/20 = 15

      // Test with long text (should be smaller)
      const longText = "This is a very long text that should have smaller font";
      const normalText = "Short text";
      expect(generator.calculateFontSize(400, 300, longText)).toBeLessThan(
        generator.calculateFontSize(400, 300, normalText)
      );

      // Test minimum font size
      expect(generator.calculateFontSize(100, 100, "Test")).toBe(12); // Should not go below 12

      // Test maximum font size
      expect(generator.calculateFontSize(2000, 2000, "Test")).toBe(72); // Should not exceed 72
    });

    test("generateDisplayText should format text correctly", () => {
      expect(generator.generateDisplayText(10, 800, 600)).toBe(
        "10MB 800 × 600"
      );
      expect(generator.generateDisplayText(2.5, 1024, 768)).toBe(
        "2.5MB 1024 × 768"
      );
    });

    test("renderCenteredText should call canvas methods correctly", () => {
      const mockCtx = {
        font: "",
        fillStyle: "",
        textAlign: "",
        textBaseline: "",
        fillText: jest.fn(),
      };

      generator.renderCenteredText(mockCtx, "Test Text", 400, 300);

      expect(mockCtx.font).toMatch(/^\d+px Arial$/);
      expect(mockCtx.fillStyle).toBe("#000000");
      expect(mockCtx.textAlign).toBe("center");
      expect(mockCtx.textBaseline).toBe("middle");
      expect(mockCtx.fillText).toHaveBeenCalledWith("Test Text", 200, 150);
    });

    test("generateImageWithText should create image with text", () => {
      const config = {
        width: 400,
        height: 300,
        format: "jpg",
        sizeMB: 5,
      };

      const buffer = generator.generateImageWithText(config);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test("generateImageWithText should use custom colors and font", () => {
      const config = {
        width: 400,
        height: 300,
        format: "png",
        sizeMB: 3,
        backgroundColor: "#ff0000",
        textColor: "#ffffff",
        fontFamily: "Helvetica",
      };

      const buffer = generator.generateImageWithText(config);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    test("generateImageWithText should throw error for unsupported format", () => {
      const config = {
        width: 400,
        height: 300,
        format: "gif",
        sizeMB: 5,
      };

      expect(() => generator.generateImageWithText(config)).toThrow(
        "Unsupported format: gif"
      );
    });
  });

  describe("Volume control algorithm", () => {
    test("estimateInitialDimensions should return reasonable dimensions", () => {
      const targetSize = generator.mbToBytes(10); // 10MB
      const dimensions = generator.estimateInitialDimensions(targetSize, "jpg");

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(typeof dimensions.width).toBe("number");
      expect(typeof dimensions.height).toBe("number");
    });

    test("adjustDimensions should scale dimensions correctly", () => {
      const result = generator.adjustDimensions(1000000, 2000000, 100, 100); // Need 2x size

      // Should increase dimensions (approximately sqrt(2) times)
      expect(result.width).toBeGreaterThan(100);
      expect(result.height).toBeGreaterThan(100);
      expect(result.width).toBeLessThan(200); // Should not double
      expect(result.height).toBeLessThan(200);
    });

    test("adjustDimensions should not make dimensions too small", () => {
      const result = generator.adjustDimensions(1000000, 1000, 100, 100); // Need much smaller size

      // Should not go below minimum
      expect(result.width).toBeGreaterThanOrEqual(50);
      expect(result.height).toBeGreaterThanOrEqual(50);
    });

    test("isWithinTolerance should check tolerance correctly", () => {
      expect(generator.isWithinTolerance(1000, 1000, 0.05)).toBe(true); // Exact match
      expect(generator.isWithinTolerance(1050, 1000, 0.05)).toBe(false); // 5% over
      expect(generator.isWithinTolerance(1040, 1000, 0.05)).toBe(true); // 4% over, within 5%
      expect(generator.isWithinTolerance(960, 1000, 0.05)).toBe(true); // 4% under, within 5%
      expect(generator.isWithinTolerance(950, 1000, 0.05)).toBe(false); // 5% under
    });

    test("generateImageWithTargetSize should return image info", () => {
      const config = {
        targetSizeMB: 1,
        format: "jpg",
      };

      const result = generator.generateImageWithTargetSize(config);

      expect(result).toHaveProperty("buffer");
      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
      expect(result).toHaveProperty("actualSizeBytes");
      expect(result).toHaveProperty("actualSizeMB");
      expect(result).toHaveProperty("targetSizeMB");
      expect(result).toHaveProperty("iterations");
      expect(result).toHaveProperty("format");

      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.targetSizeMB).toBe(1);
      expect(result.format).toBe("jpg");
      expect(result.iterations).toBeGreaterThan(0);
    });

    test("generateImageWithTargetSize should throw error for invalid target size", () => {
      const config = {
        targetSizeMB: 0,
        format: "jpg",
      };

      expect(() => generator.generateImageWithTargetSize(config)).toThrow(
        "Target size must be greater than 0"
      );
    });

    test("generateImageWithTargetSize should throw error for unsupported format", () => {
      const config = {
        targetSizeMB: 1,
        format: "gif",
      };

      expect(() => generator.generateImageWithTargetSize(config)).toThrow(
        "Unsupported format: gif"
      );
    });

    test("generateImageWithTargetSize should use custom parameters", () => {
      const config = {
        targetSizeMB: 2,
        format: "png",
        backgroundColor: "#ff0000",
        textColor: "#ffffff",
        fontFamily: "Helvetica",
        maxIterations: 5,
        tolerance: 0.1,
      };

      const result = generator.generateImageWithTargetSize(config);

      expect(result.targetSizeMB).toBe(2);
      expect(result.format).toBe("png");
      expect(result.iterations).toBeLessThanOrEqual(5);
    });
  });

  describe("Comprehensive image generation tests", () => {
    test("should generate JPG images with different target sizes", () => {
      const testSizes = [1, 2, 5]; // MB

      testSizes.forEach((sizeMB) => {
        const result = generator.generateImageWithTargetSize({
          targetSizeMB: sizeMB,
          format: "jpg",
        });

        expect(result.targetSizeMB).toBe(sizeMB);
        expect(result.format).toBe("jpg");
        expect(result.actualSizeMB).toBeGreaterThan(0);
        expect(Buffer.isBuffer(result.buffer)).toBe(true);

        // Check that the actual size is reasonably close to target
        // (within 10% for testing purposes, as we're using mocks)
        const tolerance = 0.1;
        const actualSizeMB = result.actualSizeMB;
        expect(Math.abs(actualSizeMB - sizeMB) / sizeMB).toBeLessThan(
          tolerance
        );
      });
    });

    test("should generate PNG images with different target sizes", () => {
      const testSizes = [1, 3]; // MB

      testSizes.forEach((sizeMB) => {
        const result = generator.generateImageWithTargetSize({
          targetSizeMB: sizeMB,
          format: "png",
        });

        expect(result.targetSizeMB).toBe(sizeMB);
        expect(result.format).toBe("png");
        expect(result.actualSizeMB).toBeGreaterThan(0);
        expect(Buffer.isBuffer(result.buffer)).toBe(true);
      });
    });

    test("should generate images with correct text content", () => {
      const result = generator.generateImageWithTargetSize({
        targetSizeMB: 2,
        format: "jpg",
      });

      const expectedText = generator.generateDisplayText(
        2,
        result.width,
        result.height
      );
      expect(expectedText).toMatch(/^2MB \d+ × \d+$/);
    });

    test("should handle edge cases for small target sizes", () => {
      const result = generator.generateImageWithTargetSize({
        targetSizeMB: 0.1, // Very small size
        format: "jpg",
      });

      expect(result.width).toBeGreaterThanOrEqual(50); // Minimum size enforced
      expect(result.height).toBeGreaterThanOrEqual(50);
      expect(result.actualSizeMB).toBeGreaterThan(0);
    });

    test("should handle edge cases for large target sizes", () => {
      const result = generator.generateImageWithTargetSize({
        targetSizeMB: 50, // Large size
        format: "jpg",
      });

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.actualSizeMB).toBeGreaterThan(0);
    });

    test("should respect custom styling parameters", () => {
      const result = generator.generateImageWithTargetSize({
        targetSizeMB: 3,
        format: "png",
        backgroundColor: "#ff0000",
        textColor: "#ffffff",
        fontFamily: "Helvetica",
      });

      expect(result.format).toBe("png");
      expect(result.targetSizeMB).toBe(3);
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
    });

    test("should complete within reasonable iteration count", () => {
      const result = generator.generateImageWithTargetSize({
        targetSizeMB: 5,
        format: "jpg",
        maxIterations: 10,
      });

      expect(result.iterations).toBeLessThanOrEqual(10);
      expect(result.iterations).toBeGreaterThan(0);
    });

    test("should handle different tolerance levels", () => {
      const strictResult = generator.generateImageWithTargetSize({
        targetSizeMB: 2,
        format: "jpg",
        tolerance: 0.01, // 1% tolerance
      });

      const looseResult = generator.generateImageWithTargetSize({
        targetSizeMB: 2,
        format: "jpg",
        tolerance: 0.2, // 20% tolerance
      });

      // Strict tolerance might require more iterations
      expect(strictResult.iterations).toBeGreaterThanOrEqual(
        looseResult.iterations
      );
    });

    test("should generate consistent results for same parameters", () => {
      const config = {
        targetSizeMB: 3,
        format: "jpg",
        backgroundColor: "#ffffff",
        textColor: "#000000",
      };

      const result1 = generator.generateImageWithTargetSize(config);
      const result2 = generator.generateImageWithTargetSize(config);

      // Results should be consistent
      expect(result1.width).toBe(result2.width);
      expect(result1.height).toBe(result2.height);
      expect(result1.actualSizeBytes).toBe(result2.actualSizeBytes);
    });
  });

  describe("Utility methods", () => {
    test("getImageSize should return buffer length", () => {
      const buffer = Buffer.alloc(1024);
      expect(generator.getImageSize(buffer)).toBe(1024);
    });

    test("bytesToMB should convert correctly", () => {
      expect(generator.bytesToMB(1048576)).toBe(1); // 1MB
      expect(generator.bytesToMB(2097152)).toBe(2); // 2MB
    });

    test("mbToBytes should convert correctly", () => {
      expect(generator.mbToBytes(1)).toBe(1048576); // 1MB
      expect(generator.mbToBytes(2)).toBe(2097152); // 2MB
    });
  });
});
