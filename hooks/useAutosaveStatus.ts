import { useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved';

const SAVED_VISIBLE_MS = 2000;

/** Derive idle → saving → saved (brief) from an async in-flight flag. */
export function useAutosaveStatus(isSaving: boolean): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const wasSavingRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSaving) {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
      setStatus('saving');
    } else if (wasSavingRef.current) {
      setStatus('saved');
      savedTimerRef.current = setTimeout(() => {
        setStatus('idle');
        savedTimerRef.current = null;
      }, SAVED_VISIBLE_MS);
    }

    wasSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    []
  );

  return status;
}
