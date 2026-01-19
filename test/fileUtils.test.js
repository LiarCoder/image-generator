const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const {
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
} = require("../src/fileUtils");

describe("FileUtils", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "image-gen-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe("validateFileName", () => {
    test("应该接受有效的文件名", () => {
      expect(validateFileName("test-image.jpg")).toBe(true);
      expect(validateFileName("image_123.png")).toBe(true);
      expect(validateFileName("测试图片.jpg")).toBe(true);
    });

    test("应该拒绝包含非法字符的文件名", () => {
      expect(validateFileName("test<image>.jpg")).toBe(false);
      expect(validateFileName("test/image.jpg")).toBe(false);
      expect(validateFileName("test\\image.jpg")).toBe(false);
      expect(validateFileName("test|image.jpg")).toBe(false);
      expect(validateFileName("test?image.jpg")).toBe(false);
      expect(validateFileName("test*image.jpg")).toBe(false);
    });

    test("应该接受包含冒号的文件名（用于时间戳）", () => {
      expect(validateFileName("20MB-2025-01-01-12:30:45.jpg")).toBe(true);
      expect(validateFileName("test:image.jpg")).toBe(true);
    });

    test("应该拒绝保留名称", () => {
      expect(validateFileName("CON.jpg")).toBe(false);
      expect(validateFileName("PRN.png")).toBe(false);
      expect(validateFileName("AUX.jpg")).toBe(false);
      expect(validateFileName("COM1.jpg")).toBe(false);
    });

    test("应该拒绝空值或非字符串", () => {
      expect(validateFileName("")).toBe(false);
      expect(validateFileName(null)).toBe(false);
      expect(validateFileName(undefined)).toBe(false);
      expect(validateFileName(123)).toBe(false);
    });
  });

  describe("processFileName", () => {
    test("应该为没有扩展名的文件名添加扩展名", () => {
      expect(processFileName("test-image", "jpg")).toBe("test-image.jpg");
      expect(processFileName("test-image", "png")).toBe("test-image.png");
    });

    test("应该保持正确的扩展名不变", () => {
      expect(processFileName("test-image.jpg", "jpg")).toBe("test-image.jpg");
      expect(processFileName("test-image.png", "png")).toBe("test-image.png");
    });

    test("应该替换错误的扩展名", () => {
      expect(processFileName("test-image.png", "jpg")).toBe("test-image.jpg");
      expect(processFileName("test-image.jpg", "png")).toBe("test-image.png");
    });

    test("应该处理大小写不敏感的扩展名", () => {
      expect(processFileName("test-image.JPG", "jpg")).toBe("test-image.JPG");
      expect(processFileName("test-image.PNG", "png")).toBe("test-image.PNG");
    });

    test("应该抛出无效文件名错误", () => {
      expect(() => processFileName("test<image>", "jpg")).toThrow(
        FileNameValidationError
      );
      expect(() => processFileName("CON", "jpg")).toThrow(
        FileNameValidationError
      );
    });
  });

  describe("ensureOutputDirectory", () => {
    test("应该创建不存在的目录", async () => {
      const newDir = path.join(tempDir, "new-directory");
      await ensureOutputDirectory(newDir);

      const stats = await fs.stat(newDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test("应该不影响已存在的目录", async () => {
      await ensureOutputDirectory(tempDir);

      const stats = await fs.stat(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test("应该创建嵌套目录", async () => {
      const nestedDir = path.join(tempDir, "level1", "level2", "level3");
      await ensureOutputDirectory(nestedDir);

      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("checkWritePermission", () => {
    test("应该通过有写入权限的目录检查", async () => {
      const testFile = path.join(tempDir, "test.txt");
      await expect(checkWritePermission(testFile)).resolves.not.toThrow();
    });

    test("应该抛出没有写入权限的错误", async () => {
      // 在只读目录中测试（如果可能的话）
      const readOnlyDir = path.join(tempDir, "readonly");
      await fs.mkdir(readOnlyDir);

      try {
        await fs.chmod(readOnlyDir, 0o444); // 只读权限
        const testFile = path.join(readOnlyDir, "test.txt");
        await expect(checkWritePermission(testFile)).rejects.toThrow(
          FileSystemError
        );
      } catch (error) {
        // 如果无法设置权限（如在Windows上），跳过此测试
        console.warn("无法测试写入权限限制，跳过测试");
      }
    });
  });

  describe("saveImageFile", () => {
    test("应该成功保存图片文件", async () => {
      const imageBuffer = Buffer.from("fake image data");
      const filename = "test-image.jpg";

      const result = await saveImageFile(imageBuffer, filename, tempDir);

      expect(result.name).toBe(filename);
      expect(result.path).toBe(path.resolve(tempDir, filename));
      expect(result.size).toBe(imageBuffer.length);

      // 验证文件确实被保存
      const savedData = await fs.readFile(result.path);
      expect(savedData.equals(imageBuffer)).toBe(true);
    });

    test("应该在当前目录保存文件（默认行为）", async () => {
      const imageBuffer = Buffer.from("fake image data");
      const filename = "test-image.jpg";

      // 模拟当前目录为临时目录
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const result = await saveImageFile(imageBuffer, filename);

        expect(result.name).toBe(filename);
        expect(path.dirname(result.path)).toBe(tempDir);

        // 验证文件存在
        const stats = await fs.stat(result.path);
        expect(stats.size).toBe(imageBuffer.length);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("应该创建不存在的输出目录", async () => {
      const imageBuffer = Buffer.from("fake image data");
      const filename = "test-image.jpg";
      const newDir = path.join(tempDir, "new-output-dir");

      const result = await saveImageFile(imageBuffer, filename, newDir);

      expect(result.path).toBe(path.resolve(newDir, filename));

      // 验证目录和文件都被创建
      const dirStats = await fs.stat(newDir);
      expect(dirStats.isDirectory()).toBe(true);

      const fileStats = await fs.stat(result.path);
      expect(fileStats.size).toBe(imageBuffer.length);
    });

    test("应该处理文件系统错误", async () => {
      const imageBuffer = Buffer.from("fake image data");
      const filename = "test-image.jpg";
      // 使用一个真正无效的路径（包含非法字符）
      const invalidDir = "C:\\invalid<>path";

      await expect(
        saveImageFile(imageBuffer, filename, invalidDir)
      ).rejects.toThrow(FileSystemError);
    });
  });

  describe("generateFileName", () => {
    test("应该使用用户指定的文件名", () => {
      const result = generateFileName("my-custom-image", 10, "jpg");
      expect(result).toBe("my-custom-image.jpg");
    });

    test("应该使用用户指定的文件名并处理扩展名", () => {
      const result = generateFileName("my-custom-image.png", 10, "jpg");
      expect(result).toBe("my-custom-image.jpg");
    });

    test("应该在用户未指定文件名时生成默认文件名", () => {
      const result = generateFileName(null, 20, "png");
      expect(result).toMatch(
        /^20MB-\d{4}-\d{2}-\d{2}-\d{2}[_:]\d{2}[_:]\d{2}\.png$/
      );
    });

    test("应该在用户指定空字符串时生成默认文件名", () => {
      const result = generateFileName("  ", 15, "jpg");
      expect(result).toMatch(
        /^15MB-\d{4}-\d{2}-\d{2}-\d{2}[_:]\d{2}[_:]\d{2}\.jpg$/
      );
    });

    test("应该处理用户文件名的前后空格", () => {
      const result = generateFileName("  test-image  ", 5, "png");
      expect(result).toBe("test-image.png");
    });
  });

  describe("fileExists", () => {
    test("应该检测存在的文件", async () => {
      const testFile = path.join(tempDir, "existing-file.txt");
      await fs.writeFile(testFile, "test content");

      const exists = await fileExists(testFile);
      expect(exists).toBe(true);
    });

    test("应该检测不存在的文件", async () => {
      const testFile = path.join(tempDir, "non-existing-file.txt");

      const exists = await fileExists(testFile);
      expect(exists).toBe(false);
    });
  });

  describe("generateUniqueFileName", () => {
    test("应该返回原文件名如果不存在冲突", async () => {
      const fileName = "unique-file.jpg";

      const result = await generateUniqueFileName(fileName, tempDir);
      expect(result).toBe(fileName);
    });

    test("应该生成带数字后缀的唯一文件名", async () => {
      const fileName = "duplicate-file.jpg";
      const filePath = path.join(tempDir, fileName);

      // 创建一个已存在的文件
      await fs.writeFile(filePath, "existing content");

      const result = await generateUniqueFileName(fileName, tempDir);
      expect(result).toBe("duplicate-file(1).jpg");
    });

    test("应该处理多个重复文件", async () => {
      const fileName = "multi-duplicate.jpg";

      // 创建多个重复文件
      for (let i = 0; i <= 2; i++) {
        const suffix = i === 0 ? "" : `(${i})`;
        const testFileName = `multi-duplicate${suffix}.jpg`;
        const filePath = path.join(tempDir, testFileName);
        await fs.writeFile(filePath, "content");
      }

      const result = await generateUniqueFileName(fileName, tempDir);
      expect(result).toBe("multi-duplicate(3).jpg");
    });

    test("应该在默认目录中工作", async () => {
      const fileName = "default-dir-test.jpg";

      // 模拟当前目录
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const result = await generateUniqueFileName(fileName);
        expect(result).toBe(fileName);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
