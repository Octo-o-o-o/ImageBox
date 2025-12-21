/**
 * Main actions entry point - re-exports all modules for backward compatibility.
 *
 * Note: 'use server' is NOT needed here since each module has it.
 * Server Actions are defined in the individual module files.
 *
 * This file maintains backward compatibility after the modular split.
 * All Server Actions can be imported from '@/app/actions' as before.
 *
 * Module structure:
 * - settings.ts: Settings + storage path configuration
 * - providers.ts: Provider + Model management
 * - templates.ts: Template CRUD operations
 * - generation.ts: Text/Image generation + Run logs
 * - library.ts: Image + Folder management
 * - tokens.ts: Access tokens + Remote access
 * - installation.ts: Local model installation
 */

// --- Settings & Storage ---
export {
  getSettings,
  saveSetting,
  getStorageConfig,
  getActualStoragePath,
  validateStoragePath,
  getStorageStats,
  updateStoragePath,
} from './actions/settings';

// --- Providers & Models ---
export {
  ensurePresetProvidersAndModels,
  getProviders,
  saveProvider,
  deleteProvider,
  getModels,
  saveModel,
  deleteModel,
  hasImageGenerationModel,
} from './actions/providers';

// --- Templates ---
export {
  getTemplates,
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from './actions/templates';

// --- Generation & Run Logs ---
export {
  generateTextAction,
  generateImageAction,
  getRunLogs,
} from './actions/generation';

// --- Library (Images & Folders) ---
export {
  ensureDefaultFolder,
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  saveGeneratedImage,
  getImagesByFolder,
  openLocalFolder,
  openImageFolder,
  deleteImage,
  toggleFavorite,
  moveImageToFolder,
} from './actions/library';

// --- Access Tokens & Remote Access ---
export {
  getRemoteAccessEnabled,
  setRemoteAccessEnabled,
  getAccessTokens,
  createAccessToken,
  updateAccessTokenDescription,
  deleteAccessToken,
  revokeAccessToken,
  validateAccessToken,
  getLocalIpAddress,
} from './actions/tokens';

// --- Local Model Installation ---
export {
  detectLocalHardwareAction,
  discoverLocalServicesAction,
  checkLocalServiceAction,
  quickSetupLocalModelAction,
  checkLocalProviderStatusAction,
  checkInstallPrerequisitesAction,
  installPrerequisiteAction,
  getInstallCommandsAction,
  runInstallCommandAction,
  runAutoInstallStepAction,
} from './actions/installation';
