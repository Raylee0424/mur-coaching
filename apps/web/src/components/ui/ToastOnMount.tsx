'use client';

import { useEffect, useRef } from 'react';
import { useToast } from './Toast';
import type { ToastInput } from './toast-model';

/** Shows a toast once when the page mounts (e.g. after a redirect carrying `?logged=1`). */
export function ToastOnMount(props: ToastInput) {
  const { show } = useToast();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    show(props);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
