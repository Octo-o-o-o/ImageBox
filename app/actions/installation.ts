'use server';

import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { detectHardware, type HardwareInfo } from '@/lib/hardwareDetection';
import { discoverLocalServices, checkServiceUrl, type LocalService, type ServiceCheckResult } from '@/lib/localServiceDiscovery';
import {
  checkPrerequisites,
  getDefaultInstallDir,
  getOneLinerScript,
  getInstallCommands,
  runCommand,
  getEstimatedSize,
  type InstallConfig
} from '@/lib/localModelInstaller';

// === Local Model Actions ===

/**
 * Detect hardware capabilities for local model support
 */
export async function detectLocalHardwareAction(): Promise<HardwareInfo> {
  return await detectHardware();
}

/**
 * Discover locally running inference services
 */
export async function discoverLocalServicesAction(): Promise<LocalService[]> {
  return await discoverLocalServices();
}

/**
 * Check if a specific service URL is available
 */
export async function checkLocalServiceAction(url: string): Promise<ServiceCheckResult> {
  return await checkServiceUrl(url);
}

/**
 * Quick setup: Create a LOCAL provider and model in one action
 */
export async function quickSetupLocalModelAction(data: {
  providerName: string;
  serviceUrl: string;
  localBackend: string;
  modelName: string;
  modelIdentifier: string;
  parameterConfig: string;
}): Promise<{ success: boolean; providerId?: string; modelId?: string; error?: string }> {
  try {
    // First verify the service is available
    const check = await checkServiceUrl(data.serviceUrl);
    if (!check.available) {
      return { success: false, error: `Cannot connect to service: ${check.error}` };
    }

    // Create provider
    const provider = await prisma.provider.create({
      data: {
        name: data.providerName,
        type: 'LOCAL',
        baseUrl: data.serviceUrl,
        localBackend: data.localBackend,
      }
    });

    // Create model
    const model = await prisma.aIModel.create({
      data: {
        name: data.modelName,
        modelIdentifier: data.modelIdentifier,
        type: 'IMAGE',
        providerId: provider.id,
        parameterConfig: data.parameterConfig,
      }
    });

    return {
      success: true,
      providerId: provider.id,
      modelId: model.id
    };
  } catch (error) {
    console.error('Quick setup local model failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed'
    };
  }
}

/**
 * Check if a local provider's service is currently online
 */
export async function checkLocalProviderStatusAction(providerId: string): Promise<{ online: boolean; error?: string }> {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    });

    if (!provider || provider.type !== 'LOCAL') {
      return { online: false, error: 'Not a local provider' };
    }

    if (!provider.baseUrl) {
      return { online: false, error: 'Service URL not configured' };
    }

    const check = await checkServiceUrl(provider.baseUrl);
    return { online: check.available, error: check.error };
  } catch (error) {
    return { online: false, error: error instanceof Error ? error.message : 'Detection failed' };
  }
}

// === Auto Deploy Actions ===

/**
 * Check system prerequisites for local model installation
 */
export async function checkInstallPrerequisitesAction() {
  const prereqs = await checkPrerequisites();
  const installDir = getDefaultInstallDir();

  return {
    prerequisites: prereqs,
    installDir,
    platform: process.platform,
    arch: process.arch,
  };
}

/**
 * Install missing prerequisites
 */
export async function installPrerequisiteAction(
  tool: 'cmake' | 'huggingface' | 'brew'
): Promise<{ success: boolean; message: string; error?: string }> {
  const platform = process.platform;

  try {
    switch (tool) {
      case 'brew': {
        if (platform !== 'darwin') {
          return { success: false, message: 'Homebrew is only supported on macOS', error: 'Not macOS' };
        }
        // Install Homebrew
        const result = await runCommand('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        return result.success
          ? { success: true, message: 'Homebrew installed successfully' }
          : { success: false, message: 'Homebrew installation failed', error: result.error };
      }

      case 'cmake': {
        if (platform === 'darwin') {
          // Try brew first
          let result = await runCommand('brew install cmake');
          if (result.success) {
            return { success: true, message: 'CMake installed successfully (via Homebrew)' };
          }
          // Try to install brew first then cmake
          return { success: false, message: 'Please install Homebrew first', error: 'brew not found' };
        } else if (platform === 'linux') {
          // Try apt
          const result = await runCommand('sudo apt-get install -y cmake');
          return result.success
            ? { success: true, message: 'CMake installed successfully' }
            : { success: false, message: 'CMake installation failed', error: result.error };
        } else {
          return { success: false, message: 'Please install CMake manually', error: 'Unsupported platform' };
        }
      }

      case 'huggingface': {
        // Use python3 -m pip to install huggingface_hub[cli]
        // Try different installation approaches
        const installCommands = platform === 'darwin'
          ? [
              // macOS: Try with --break-system-packages for system Python
              'python3 -m pip install -U "huggingface_hub[cli]" --break-system-packages',
              // Fallback: user install
              'python3 -m pip install -U "huggingface_hub[cli]" --user',
              // Fallback: plain pip3
              'pip3 install -U "huggingface_hub[cli]"',
            ]
          : [
              'python3 -m pip install -U "huggingface_hub[cli]"',
              'pip3 install -U "huggingface_hub[cli]"',
              'pip install -U "huggingface_hub[cli]"',
            ];

        let result: { success: boolean; output: string; error?: string } = { success: false, output: '', error: '' };
        for (const cmd of installCommands) {
          result = await runCommand(cmd);
          if (result.success) break;
        }

        if (!result.success) {
          return { success: false, message: 'HuggingFace CLI installation failed', error: result.error };
        }

        // Verify installation by checking if we can import the module
        const verifyResult = await runCommand('python3 -c "import huggingface_hub; print(huggingface_hub.__version__)"');
        if (!verifyResult.success) {
          return { success: false, message: 'Installation completed but verification failed', error: verifyResult.error };
        }

        // Get the path where huggingface-cli is installed
        const whichResult = await runCommand('python3 -c "import shutil; print(shutil.which(\'huggingface-cli\') or \'\')"');
        const cliPath = whichResult.output?.trim();

        if (!cliPath) {
          // CLI not in PATH, try to find it
          const siteResult = await runCommand('python3 -c "import site; print(site.USER_BASE)"');
          const userBase = siteResult.output?.trim();
          const binPath = `${userBase}/bin`;

          return {
            success: true,
            message: `HuggingFace CLI installed, but may need to add ${binPath} to PATH.\nPlease run: export PATH="${binPath}:$PATH" or restart terminal.`
          };
        }

        return { success: true, message: 'HuggingFace CLI installed successfully' };
      }

      default:
        return { success: false, message: 'Unknown tool', error: `Unknown tool: ${tool}` };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Installation failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get install commands for the current platform
 */
export async function getInstallCommandsAction(modelVariant: 'full' | 'q8' | 'q4' | 'q2' = 'q4', port: number = 8080) {
  const installDir = getDefaultInstallDir();
  const config: InstallConfig = { installDir, modelVariant, port };

  return {
    commands: getInstallCommands(config),
    oneLiner: getOneLinerScript(config),
    estimatedSize: getEstimatedSize(modelVariant),
    installDir,
  };
}

/**
 * Run a single install command
 */
export async function runInstallCommandAction(command: string, cwd?: string) {
  return await runCommand(command, cwd);
}

/**
 * Run the complete installation process
 * This is a long-running operation that should be called step by step
 */
export async function runAutoInstallStepAction(
  step: 'create-dir' | 'clone-repo' | 'build' | 'download-model' | 'verify',
  modelVariant: 'full' | 'q8' | 'q4' | 'q2' = 'q4'
): Promise<{ success: boolean; message: string; error?: string }> {
  const installDir = getDefaultInstallDir();
  const platform = process.platform;

  try {
    switch (step) {
      case 'create-dir': {
        await fs.mkdir(installDir, { recursive: true });
        return { success: true, message: `Created directory: ${installDir}` };
      }

      case 'clone-repo': {
        const result = await runCommand(
          'git clone --depth 1 https://github.com/leejet/stable-diffusion.cpp',
          installDir
        );
        if (!result.success) {
          // Check if already exists
          try {
            await fs.access(path.join(installDir, 'stable-diffusion.cpp'));
            return { success: true, message: 'Repository already exists, skipping clone' };
          } catch {
            return { success: false, message: 'Clone failed', error: result.error };
          }
        }
        return { success: true, message: 'Cloned stable-diffusion.cpp' };
      }

      case 'build': {
        const sdcppDir = path.join(installDir, 'stable-diffusion.cpp');
        const buildDir = path.join(sdcppDir, 'build');

        // Initialize git submodules (required for ggml)
        let result = await runCommand('git submodule update --init --recursive', sdcppDir);
        if (!result.success) {
          return { success: false, message: 'Failed to initialize submodules', error: result.error };
        }

        // Create build directory
        await fs.mkdir(buildDir, { recursive: true });

        // Configure cmake
        const cmakeFlag = platform === 'darwin' ? '-DSD_METAL=ON' : '-DSD_CUDA=ON';
        result = await runCommand(`cmake .. ${cmakeFlag} -DCMAKE_BUILD_TYPE=Release`, buildDir);
        if (!result.success) {
          return { success: false, message: 'CMake configuration failed', error: result.error };
        }

        // Build
        result = await runCommand('cmake --build . --config Release -j', buildDir);
        if (!result.success) {
          return { success: false, message: 'Build failed', error: result.error };
        }

        return { success: true, message: 'Build completed' };
      }

      case 'download-model': {
        const modelsDir = path.join(installDir, 'models');
        await fs.mkdir(modelsDir, { recursive: true });

        const modelName = modelVariant === 'full' ? 'Z-Image-Turbo' : `Z-Image-Turbo-${modelVariant.toUpperCase()}`;
        // Use Python API directly (more reliable than CLI which may not be in PATH)
        const downloadScript = `python3 -c "from huggingface_hub import snapshot_download; snapshot_download('Tongyi-MAI/${modelName}', local_dir='${modelName}')"`;
        const result = await runCommand(downloadScript, modelsDir);

        if (!result.success) {
          return { success: false, message: 'Model download failed', error: result.error };
        }

        return { success: true, message: `Model ${modelName} downloaded` };
      }

      case 'verify': {
        const sdcppDir = path.join(installDir, 'stable-diffusion.cpp', 'build', 'bin');
        const ext = platform === 'win32' ? '.exe' : '';

        try {
          await fs.access(path.join(sdcppDir, `sd${ext}`));
          return { success: true, message: 'Installation verified successfully' };
        } catch {
          return { success: false, message: 'Build artifact not found', error: 'Please check if build was successful' };
        }
      }

      default:
        return { success: false, message: 'Unknown step', error: `Unknown step: ${step}` };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Execution failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
