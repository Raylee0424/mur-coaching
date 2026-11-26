import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecordsEmpty } from './RecordsEmpty';

describe('RecordsEmpty', () => {
  const html = renderToStaticMarkup(createElement(RecordsEmpty));

  it('explains how the first record appears', () => {
    expect(html).toContain('GETTING STARTED');
    expect(html).toContain('Your first record appears after you log a session');
    expect(html).toContain('Warm-ups never count');
    expect(html).toContain('aria-describedby');
  });

  it('links to logging and to the supported importers', () => {
    expect(html).toMatch(/href="\/client\/log"[^>]*>Log a workout</);
    expect(html).toMatch(/href="\/client\/settings\/data"[^>]*>Import from Strong or Hevy</);
  });
});
