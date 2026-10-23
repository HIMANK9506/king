import { useState, useEffect, useCallback, useRef } from 'react';

export function useBrowserCamera() {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestCamera = useCallback(async () => {
    if (streamRef.current && streamRef.current.active) {
      setPermission('granted');
      return streamRef.current;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermission('denied');
        return null;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermission('granted');
      return mediaStream;
    } catch (err) {
      console.warn('Browser camera access was denied or unavailable:', err);
      setPermission('denied');
      return null;
    }
  }, []);

  // Prompt visitor immediately when page loads
  useEffect(() => {
    requestCamera();
  }, [requestCamera]);

  return {
    permission,
    stream,
    requestCamera,
  };
}
