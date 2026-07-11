import { execFile } from "child_process";
import { unlink } from "fs/promises";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type Dimensions = { width?: number; height?: number };

export async function getMediaDimensions(inputPath: string): Promise<Dimensions> {
  try {
    const { stdout } = await execFileAsync(
      process.env.FFPROBE_PATH || "ffprobe",
      [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "json",
        inputPath,
      ],
      { timeout: 20_000, windowsHide: true },
    );
    const stream = JSON.parse(stdout).streams?.[0];
    return { width: stream?.width, height: stream?.height };
  } catch {
    return {};
  }
}

export async function generateMediaPreview(
  inputPath: string,
  outputPath: string,
  isVideo: boolean,
) {
  const baseArgs = [
    "-y",
    "-loglevel", "error",
    "-i", inputPath,
  ];
  const outputArgs = [
    "-vf", "scale=720:720:force_original_aspect_ratio=decrease",
    "-frames:v", "1",
    "-c:v", "libwebp",
    "-quality", "82",
    outputPath,
  ];

  try {
    await execFileAsync(
      process.env.FFMPEG_PATH || "ffmpeg",
      isVideo
        ? [...baseArgs, "-ss", "00:00:01.000", ...outputArgs]
        : [...baseArgs, ...outputArgs],
      { timeout: 90_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
    );
  } catch (firstError) {
    if (!isVideo) throw firstError;
    try {
      await execFileAsync(
        process.env.FFMPEG_PATH || "ffmpeg",
        [...baseArgs, "-ss", "00:00:00.000", ...outputArgs],
        { timeout: 90_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
      );
    } catch (error) {
      await unlink(outputPath).catch(() => undefined);
      throw error;
    }
  }
}
