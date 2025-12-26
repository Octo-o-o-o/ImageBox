/**
 * Keyboard shortcut settings utility
 * Manages shortcut preferences in localStorage
 */

const SHORTCUT_CMD_ENTER_KEY = 'imagebox_shortcut_cmd_enter';

export type ShortcutState = 'enabled' | 'disabled' | 'unconfirmed';

/**
 * Get the state of the Cmd/Ctrl+Enter shortcut
 * - 'enabled': User confirmed and enabled the shortcut
 * - 'disabled': User explicitly disabled the shortcut
 * - 'unconfirmed': User hasn't been asked yet (first time)
 */
export function getShortcutCmdEnterState(): ShortcutState {
  if (typeof window === 'undefined') return 'unconfirmed';

  try {
    const value = localStorage.getItem(SHORTCUT_CMD_ENTER_KEY);
    if (value === 'enabled') return 'enabled';
    if (value === 'disabled') return 'disabled';
    return 'unconfirmed';
  } catch {
    return 'unconfirmed';
  }
}

/**
 * Set the Cmd/Ctrl+Enter shortcut state
 */
export function setShortcutCmdEnterState(state: 'enabled' | 'disabled'): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SHORTCUT_CMD_ENTER_KEY, state);
  } catch (e) {
    console.warn('Failed to save shortcut preference:', e);
  }
}

/**
 * Check if a shortcut is enabled (treats 'unconfirmed' as enabled for settings UI)
 */
export function isShortcutCmdEnterEnabled(): boolean {
  const state = getShortcutCmdEnterState();
  return state !== 'disabled';
}

/**
 * Get the shortcut key display string based on platform
 */
export function getShortcutKeyDisplay(): string {
  if (typeof window === 'undefined') return '⌘/Ctrl + Enter';

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘ + Enter' : 'Ctrl + Enter';
}
