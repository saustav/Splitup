import * as Clipboard from 'expo-clipboard';
import { Alert, Platform, Share } from 'react-native';

/** Copy text — uses the browser Clipboard API on web. */
export async function copyText(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Clipboard is not available in this browser');
  }

  await Clipboard.setStringAsync(text);
}

/** Read clipboard — uses the browser API on web. */
export async function readClipboardText(): Promise<string> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      return navigator.clipboard.readText();
    }
    throw new Error('Clipboard is not available in this browser');
  }

  const text = await Clipboard.getStringAsync();
  return text ?? '';
}

export type ShareContent = {
  title: string;
  message: string;
  url?: string;
};

/** Share text/link — Web Share API on web, React Native Share elsewhere. */
export async function shareContent(content: ShareContent): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: content.title,
          text: content.message,
          url: content.url,
        });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        throw e;
      }
    }

    await copyText(content.message);
    Alert.alert('Copied', 'Invite details copied to your clipboard.');
    return;
  }

  const result = await Share.share(
    {
      message: content.message,
      url: content.url,
      title: content.title,
    },
    { dialogTitle: content.title }
  );

  if (result.action === Share.dismissedAction) {
    return;
  }
}
