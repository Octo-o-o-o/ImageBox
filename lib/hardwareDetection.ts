/**
 * Hardware Detection Module
 * 
 * Detects hardware capabilities to determine local model support.
 * Supports NVIDIA GPUs (Windows/Linux) and Apple Silicon (macOS).
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type SupportLevel = 'full' | 'experimental' | 'none';

export interface GPUInfo {
  vendor: 'nvidia' | 'amd' | 'apple' | 'intel' | 'unknown';
  name: string;
  vram?: number; // MB (discrete VRAM)
}

export interface AppleChipInfo {
  name: string;           // e.g., "Apple M4 Pro"
  coreCount?: number;     // GPU core count
  unifiedMemory: number;  // MB
  availableForAI: number; // Estimated MB available for AI
}

export interface LocalModelSupport {
  supported: boolean;
  level: SupportLevel;
  reason: string;
  recommendations: string[];
  compatibleVersions: string[]; // Compatible model version IDs
}

export interface HardwareInfo {
  os: 'windows' | 'macos' | 'linux' | 'unknown';
  arch: 'x64' | 'arm64' | 'unknown';
  gpu: GPUInfo | null;
  ram: number; // MB (system memory)
  appleChip?: AppleChipInfo;
  localModelSupport: LocalModelSupport;
}

/**
 * Parse memory string like "64 GB" to MB
 */
function parseMemoryToMB(memoryStr: string): number {
  const match = memoryStr.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'TB': return value * 1024 * 1024;
    case 'GB': return value * 1024;
    case 'MB': return value;
    default: return 0;
  }
}

/**
 * Calculate available memory for AI on Apple Silicon
 */
function calculateAppleSiliconAIMemory(totalMB: number): number {
  // Reserve 4GB for system
  const systemReserved = 4 * 1024;
  const available = totalMB - systemReserved;
  
  // Adjust available ratio based on total memory
  if (totalMB >= 64 * 1024) {
    // 64GB+: can use 70%
    return Math.floor(available * 0.7);
  } else if (totalMB >= 32 * 1024) {
    // 32GB: can use 65%
    return Math.floor(available * 0.65);
  } else if (totalMB >= 16 * 1024) {
    // 16GB: can use 60%
    return Math.floor(available * 0.6);
  } else {
    // 8GB: can use 50% (very tight)
    return Math.floor(available * 0.5);
  }
}

/**
 * Get compatible model versions based on available memory
 */
function getCompatibleVersions(availableMemoryMB: number, backend: 'metal' | 'cuda' | 'vulkan'): string[] {
  const versions: string[] = [];
  
  // Q2 extreme quantized: ~2GB
  if (availableMemoryMB >= 2 * 1024) {
    versions.push('Q2');
  }
  
  // Q4 quantized: ~4GB
  if (availableMemoryMB >= 4 * 1024) {
    versions.push('Q4');
  }
  
  // Q8 quantized: ~8GB
  if (availableMemoryMB >= 8 * 1024) {
    versions.push('Q8');
  }
  
  // Full version: ~16GB
  if (availableMemoryMB >= 16 * 1024) {
    versions.push('FULL');
  }
  
  return versions;
}

/**
 * Get recommendations for Apple Silicon users
 */
function getAppleRecommendations(availableMemoryMB: number): string[] {
  const recommendations: string[] = [];
  
  if (availableMemoryMB < 4 * 1024) {
    recommendations.push('内存不足，建议使用 Q2 极限量化版本');
    recommendations.push('考虑关闭其他应用以释放内存');
  } else if (availableMemoryMB < 8 * 1024) {
    recommendations.push('推荐使用 Q4 量化版本获得更好的性能');
  } else if (availableMemoryMB < 16 * 1024) {
    recommendations.push('推荐使用 Q8 量化版本获得高质量输出');
  } else {
    recommendations.push('可以使用完整版模型获得最佳质量');
  }
  
  recommendations.push('使用 stable-diffusion.cpp (Metal 后端)');
  
  return recommendations;
}

/**
 * Detect Apple Silicon hardware
 */
async function detectAppleSilicon(): Promise<HardwareInfo> {
  try {
    const { stdout } = await execAsync('system_profiler SPHardwareDataType -json');
    const data = JSON.parse(stdout);
    
    const hwInfo = data.SPHardwareDataType?.[0] || {};
    const chipName = hwInfo.chip_type || hwInfo.machine_name || 'Apple Silicon';
    const totalMemory = hwInfo.physical_memory || '8 GB';
    const memoryMB = parseMemoryToMB(totalMemory);
    
    const availableForAI = calculateAppleSiliconAIMemory(memoryMB);
    const compatibleVersions = getCompatibleVersions(availableForAI, 'metal');
    
    const appleChip: AppleChipInfo = {
      name: chipName,
      unifiedMemory: memoryMB,
      availableForAI: availableForAI
    };
    
    // Determine support level
    let supported = false;
    let level: SupportLevel = 'none';
    let reason = '';
    
    if (availableForAI >= 4 * 1024) {
      supported = true;
      level = 'experimental';
      reason = 'Apple Silicon 通过 Metal 后端支持，性能因芯片型号而异';
    } else if (availableForAI >= 2 * 1024) {
      supported = true;
      level = 'experimental';
      reason = '内存较紧张，仅支持 Q2 极限量化版本，可能较慢';
    } else {
      reason = '统一内存不足 8GB，无法运行本地模型';
    }
    
    return {
      os: 'macos',
      arch: 'arm64',
      gpu: { vendor: 'apple', name: chipName },
      ram: memoryMB,
      appleChip,
      localModelSupport: {
        supported,
        level,
        reason,
        recommendations: supported ? getAppleRecommendations(availableForAI) : [],
        compatibleVersions
      }
    };
  } catch (error) {
    console.error('Failed to detect Apple Silicon:', error);
    return createUnsupportedResult('macos', 'arm64', '无法检测 Apple Silicon 硬件信息');
  }
}

/**
 * Detect NVIDIA GPU on Windows/Linux
 */
async function detectNvidiaGPU(): Promise<{ name: string; vram: number } | null> {
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
    const lines = stdout.trim().split('\n');
    
    if (lines.length > 0) {
      const [name, vramMB] = lines[0].split(', ');
      return {
        name: name.trim(),
        vram: parseInt(vramMB.trim(), 10)
      };
    }
  } catch {
    // nvidia-smi not available or no NVIDIA GPU
  }
  return null;
}

/**
 * Detect discrete GPU on Windows/Linux
 */
async function detectDiscreteGPU(os: 'windows' | 'linux'): Promise<HardwareInfo> {
  // Try NVIDIA first
  const nvidiaGPU = await detectNvidiaGPU();
  
  if (nvidiaGPU) {
    const vramMB = nvidiaGPU.vram;
    const compatibleVersions = getCompatibleVersions(vramMB, 'cuda');
    
    let supported = false;
    let level: SupportLevel = 'none';
    let reason = '';
    const recommendations: string[] = [];
    
    if (vramMB >= 16 * 1024) {
      supported = true;
      level = 'full';
      reason = '完全支持，可使用完整版模型';
      recommendations.push('推荐使用完整版模型获得最佳质量');
    } else if (vramMB >= 8 * 1024) {
      supported = true;
      level = 'full';
      reason = '完全支持，推荐 Q8 量化版本';
      recommendations.push('推荐使用 Q8 量化版本');
    } else if (vramMB >= 6 * 1024) {
      supported = true;
      level = 'full';
      reason = '支持，推荐 Q4 量化版本';
      recommendations.push('推荐使用 Q4 量化版本');
    } else if (vramMB >= 4 * 1024) {
      supported = true;
      level = 'experimental';
      reason = '显存较紧张，需使用 Q4 或 Q2 量化版本';
      recommendations.push('使用 Q4 或 Q2 量化版本');
    } else {
      reason = `显存不足 (${vramMB}MB)，需要至少 4GB 显存`;
    }
    
    if (supported) {
      recommendations.push('推荐使用 stable-diffusion.cpp (CUDA 后端)');
    }
    
    return {
      os,
      arch: 'x64',
      gpu: { vendor: 'nvidia', name: nvidiaGPU.name, vram: vramMB },
      ram: 0, // Not critical for discrete GPU
      localModelSupport: {
        supported,
        level,
        reason,
        recommendations,
        compatibleVersions
      }
    };
  }
  
  // No NVIDIA GPU found
  return createUnsupportedResult(os, 'x64', '未检测到 NVIDIA GPU，本地模型需要 NVIDIA 显卡（AMD 支持为实验性）');
}

/**
 * Create an unsupported result
 */
function createUnsupportedResult(
  os: 'windows' | 'macos' | 'linux' | 'unknown',
  arch: 'x64' | 'arm64' | 'unknown',
  reason: string
): HardwareInfo {
  return {
    os,
    arch,
    gpu: null,
    ram: 0,
    localModelSupport: {
      supported: false,
      level: 'none',
      reason,
      recommendations: [],
      compatibleVersions: []
    }
  };
}

/**
 * Main hardware detection function
 */
export async function detectHardware(): Promise<HardwareInfo> {
  const platform = process.platform;
  const arch = process.arch;
  
  // macOS with Apple Silicon
  if (platform === 'darwin' && arch === 'arm64') {
    return await detectAppleSilicon();
  }
  
  // macOS with Intel (not supported)
  if (platform === 'darwin' && arch === 'x64') {
    return createUnsupportedResult('macos', 'x64', 'Intel Mac 不支持本地模型，需要 Apple Silicon 或 NVIDIA GPU');
  }
  
  // Windows
  if (platform === 'win32') {
    return await detectDiscreteGPU('windows');
  }
  
  // Linux
  if (platform === 'linux') {
    return await detectDiscreteGPU('linux');
  }
  
  // Unknown platform
  return createUnsupportedResult('unknown', 'unknown', '不支持的操作系统');
}

/**
 * Quick check if local models are supported (without full detection)
 */
export async function isLocalModelSupported(): Promise<boolean> {
  try {
    const hardware = await detectHardware();
    return hardware.localModelSupport.supported;
  } catch {
    return false;
  }
}

/**
 * Format hardware info for display
 */
export function formatHardwareInfo(info: HardwareInfo): string {
  const parts: string[] = [];
  
  if (info.gpu) {
    parts.push(`GPU: ${info.gpu.name}`);
    if (info.gpu.vram) {
      parts.push(`显存: ${Math.round(info.gpu.vram / 1024)}GB`);
    }
  }
  
  if (info.appleChip) {
    parts.push(`芯片: ${info.appleChip.name}`);
    parts.push(`统一内存: ${Math.round(info.appleChip.unifiedMemory / 1024)}GB`);
    parts.push(`可用于 AI: ~${Math.round(info.appleChip.availableForAI / 1024)}GB`);
  }
  
  return parts.join(' | ');
}

