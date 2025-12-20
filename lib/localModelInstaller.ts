/**
 * Local Model Installer
 * 
 * Handles automatic download and setup of local inference services.
 * Supports stable-diffusion.cpp with Z-Image model.
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export type InstallStep = 'idle' | 'checking' | 'downloading-binary' | 'downloading-model' | 'starting' | 'complete' | 'error';

export interface InstallProgress {
  step: InstallStep;
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface InstallConfig {
  installDir: string;
  modelVariant: 'full' | 'q8' | 'q4' | 'q2';
  port: number;
}

// Platform-specific binary URLs (these would need to be hosted somewhere)
// For now, we'll use the GitHub releases or build from source
const SDCPP_REPO = 'https://github.com/leejet/stable-diffusion.cpp';
const ZIMAGE_REPO = 'https://huggingface.co/Tongyi-MAI/Z-Image-Turbo';

// Model file sizes (approximate)
const MODEL_SIZES: Record<string, number> = {
  'full': 12 * 1024 * 1024 * 1024, // ~12GB
  'q8': 6 * 1024 * 1024 * 1024,    // ~6GB
  'q4': 3 * 1024 * 1024 * 1024,    // ~3GB
  'q2': 1.5 * 1024 * 1024 * 1024,  // ~1.5GB
};

/**
 * Get the default install directory based on platform
 */
export function getDefaultInstallDir(): string {
  const homeDir = os.homedir();
  
  switch (process.platform) {
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'ImageBox', 'local-models');
    case 'win32':
      return path.join(process.env.APPDATA || homeDir, 'ImageBox', 'local-models');
    case 'linux':
      return path.join(homeDir, '.local', 'share', 'imagebox', 'local-models');
    default:
      return path.join(homeDir, '.imagebox', 'local-models');
  }
}

/**
 * Check if required tools are installed
 */
export async function checkPrerequisites(): Promise<{
  git: boolean;
  cmake: boolean;
  python: boolean;
  huggingface: boolean;
  xcode?: boolean; // macOS only
  cuda?: boolean;  // Windows/Linux only
}> {
  const results: any = {
    git: false,
    cmake: false,
    python: false,
    huggingface: false,
  };
  
  // Check git
  try {
    await execAsync('git --version');
    results.git = true;
  } catch {}
  
  // Check cmake
  try {
    await execAsync('cmake --version');
    results.cmake = true;
  } catch {}
  
  // Check python
  try {
    await execAsync('python3 --version');
    results.python = true;
  } catch {
    try {
      await execAsync('python --version');
      results.python = true;
    } catch {}
  }
  
  // Check huggingface-cli
  try {
    await execAsync('huggingface-cli --version');
    results.huggingface = true;
  } catch {}
  
  // Platform-specific checks
  if (process.platform === 'darwin') {
    try {
      await execAsync('xcode-select -p');
      results.xcode = true;
    } catch {
      results.xcode = false;
    }
  }
  
  if (process.platform === 'win32' || process.platform === 'linux') {
    try {
      await execAsync('nvidia-smi');
      results.cuda = true;
    } catch {
      results.cuda = false;
    }
  }
  
  return results;
}

/**
 * Get installation commands for the current platform
 */
export function getInstallCommands(config: InstallConfig): string[] {
  const { installDir, modelVariant, port } = config;
  const platform = process.platform;
  
  const commands: string[] = [];
  
  // Create install directory
  commands.push(`mkdir -p "${installDir}"`);
  commands.push(`cd "${installDir}"`);
  
  // Clone stable-diffusion.cpp
  commands.push(`git clone --depth 1 ${SDCPP_REPO}`);
  commands.push(`cd stable-diffusion.cpp`);
  
  // Build commands based on platform
  commands.push(`mkdir -p build && cd build`);
  
  if (platform === 'darwin') {
    // macOS with Metal
    commands.push(`cmake .. -DSD_METAL=ON -DCMAKE_BUILD_TYPE=Release`);
  } else if (platform === 'win32') {
    // Windows with CUDA
    commands.push(`cmake .. -DSD_CUDA=ON -DCMAKE_BUILD_TYPE=Release`);
  } else {
    // Linux with CUDA
    commands.push(`cmake .. -DSD_CUDA=ON -DCMAKE_BUILD_TYPE=Release`);
  }
  
  commands.push(`cmake --build . --config Release -j`);
  
  // Download model
  commands.push(`cd "${installDir}"`);
  commands.push(`mkdir -p models`);
  
  // Use huggingface-cli to download
  const modelName = modelVariant === 'full' ? 'Z-Image-Turbo' : `Z-Image-Turbo-${modelVariant.toUpperCase()}`;
  commands.push(`huggingface-cli download Tongyi-MAI/${modelName} --local-dir models/${modelName}`);
  
  return commands;
}

/**
 * Get the command to start the server
 */
export function getStartCommand(config: InstallConfig): string {
  const { installDir, modelVariant, port } = config;
  const modelName = modelVariant === 'full' ? 'Z-Image-Turbo' : `Z-Image-Turbo-${modelVariant.toUpperCase()}`;
  
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  
  return `"${installDir}/stable-diffusion.cpp/build/bin/sd${ext}" --mode server --model "${installDir}/models/${modelName}" --port ${port}`;
}

/**
 * Run a shell command and return output
 */
export async function runCommand(command: string, cwd?: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { success: true, output: stdout + stderr };
  } catch (e: any) {
    return { success: false, output: '', error: e.message };
  }
}

/**
 * Start the local inference server as a background process
 */
let serverProcess: ChildProcess | null = null;

export function startServer(config: InstallConfig): { success: boolean; error?: string } {
  try {
    const command = getStartCommand(config);
    const [cmd, ...args] = command.split(' ');
    
    serverProcess = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore',
    });
    
    serverProcess.unref();
    
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Stop the local inference server
 */
export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

/**
 * Check if server is running
 */
export async function isServerRunning(port: number = 8080): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get a one-liner install script for quick copy
 */
export function getOneLinerScript(config: InstallConfig): string {
  const { installDir, modelVariant, port } = config;
  const platform = process.platform;
  
  const cmakeFlag = platform === 'darwin' ? '-DSD_METAL=ON' : '-DSD_CUDA=ON';
  const modelName = modelVariant === 'full' ? 'Z-Image-Turbo' : `Z-Image-Turbo-${modelVariant.toUpperCase()}`;
  
  return `mkdir -p "${installDir}" && cd "${installDir}" && git clone --depth 1 ${SDCPP_REPO} && cd stable-diffusion.cpp && mkdir build && cd build && cmake .. ${cmakeFlag} && cmake --build . --config Release -j && cd "${installDir}" && huggingface-cli download Tongyi-MAI/${modelName} --local-dir models/`;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Get estimated download size
 */
export function getEstimatedSize(modelVariant: string): string {
  const size = MODEL_SIZES[modelVariant] || MODEL_SIZES['q4'];
  return formatBytes(size);
}

