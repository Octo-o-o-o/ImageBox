import fs from 'fs';
import path from 'path';

const target = path.resolve('lib/i18n/index.ts');

const REMOVED_KEYS = [
  // common (4)
  'common.opensource',
  'common.create',
  'common.creating',
  'common.done',

  // create (17)
  'create.apiKeyNotConfiguredWarning',
  'create.aspectRatio.actual',
  'create.numberOfImagesLabel',
  'create.error.maxRefImages',
  'create.warning.lowResolution',
  'create.warning.aspectMismatchSingle',
  'create.warning.aspectMismatchItem',
  'create.warning.aspectMismatchList',
  'create.error.imageLoad',
  'create.dragDrop.overlay',
  'create.localServiceOffline',
  'create.localServiceOfflineDesc',
  'create.vramWarning',
  'create.vramWarningDesc',
  'create.reduceResolution',
  'create.continueAnyway',
  'create.localFirstLoad',

  // library (15)
  'library.newFolder',
  'library.emptyTitle',
  'library.emptyDesc1',
  'library.emptyDesc2',
  'library.createImages',
  'library.loading',
  'library.rename',
  'library.selection.hint',
  'library.details.dimensions',
  'library.details.ratio',
  'library.details.recreate',
  'library.details.copyPromptSuccess',
  'library.details.copyPromptFail',
  'library.close',
  'library.imageCount',

  // models (7)
  'models.providers.typeLabel',
  'models.models.presetAutoConfigured',
  'models.providers.scanServices',
  'models.providers.scanning',
  'models.providers.foundServices',
  'models.providers.noServicesFoundScan',
  'models.providers.quickAdd',

  // settings (17)
  'settings.tokens.createTitle',
  'settings.tokens.name',
  'settings.tokens.namePlaceholder',
  'settings.tokens.expiryLabel',
  'settings.tokens.created',
  'settings.tokens.saveWarning',
  'settings.tokens.lastUsed',
  'settings.storage.pathHint',
  'settings.storage.currentStats',
  'settings.storage.customPath',
  'settings.storage.defaultPath',
  'settings.storage.validate',
  'settings.storage.validating',
  'settings.storage.useDefault',
  'settings.storage.saveSuccess',
  'settings.dataManagement.reset.pathCopied',
  'settings.dataManagement.reset.success',

  // templates (22)
  'templates.promptModelLabel',
  'templates.promptModelNone',
  'templates.imageSectionTitle',
  'templates.imageModelLabel',
  'templates.imageModelDefault',
  'templates.defaultParams.title',
  'templates.defaultParams.aspectRatio',
  'templates.defaultParams.none',
  'templates.defaultParams.aspect.square',
  'templates.defaultParams.aspect.landscape',
  'templates.defaultParams.aspect.portrait',
  'templates.defaultParams.aspect.landscapeFull',
  'templates.defaultParams.aspect.portraitFull',
  'templates.defaultParams.resolution',
  'templates.defaultParams.resolution1k',
  'templates.defaultParams.resolution2k',
  'templates.defaultParams.resolution4k',
  'templates.defaultParams.note',
  'templates.card.optimizerModel',
  'templates.card.notConfigured',
  'templates.card.manualInput',
  'templates.card.default',
];

function backup(src) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
  const dst = src.replace(/index\.ts$/, `index.backup.${stamp}.ts`);
  fs.copyFileSync(src, dst);
  return dst;
}

function prune(content, keys) {
  let out = content;
  // Remove each key in all language sections: pattern is 'key': '...'
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\n\s*'${escaped}'\s*:\s*'[^']*',?`, 'g');
    out = out.replace(re, '');
  }
  return out;
}

const before = fs.readFileSync(target, 'utf8');
const backupPath = backup(target);
const after = prune(before, REMOVED_KEYS);
fs.writeFileSync(target, after);

console.log(`Backed up to: ${backupPath}`);
console.log(`Removed ${REMOVED_KEYS.length} keys (from all languages).`);

