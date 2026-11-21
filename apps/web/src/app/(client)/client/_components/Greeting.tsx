'use client';

import { useEffect, useState } from 'react';
import { greetingFor } from './today-model';

/** "Good morning, Marcus" by the athlete's own clock; the server renders a neutral "Hi" so hydration matches. */
export function Greeting({ name }: { name: string }) {
  const [hello, setHello] = useState('Hi');
  useEffect(() => setHello(greetingFor(new Date().getHours())), []);
  return (
    <>
      {hello}, {name}
    </>
  );
}
