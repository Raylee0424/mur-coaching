'use client';

import { ArrowDown, ArrowUp, Copy, Plus, Settings2, Trash2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { INTAKE_LIMITS, IntakeQuestionType } from '@coaching/shared';
import type { IntakeFormDto, IntakeQuestion } from '@coaching/shared';
import { saveIntakeForm } from '@/actions/leads';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useToast } from '@/components/ui/Toast';

/** Moves item `from` to `to`, clamped. Returns a new array. */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(target, 0, item);
  return next;
}

const newId = (): string => `q${Math.random().toString(36).slice(2, 8)}`;

/** Edit the public application form: link, headline, accepting toggle and custom questions. */
export function IntakeFormSheet({ form, origin }: { form: IntakeFormDto; origin: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(form.slug);
  const [questions, setQuestions] = useState<IntakeQuestion[]>(form.questions);
  const [state, action] = useActionState(saveIntakeForm, null);
  const link = `${origin}/apply/${slug}`;

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      toast.show({ message: 'Application form saved', tone: 'ok' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to a new result only
  }, [state]);

  const patch = (index: number, change: Partial<IntakeQuestion>): void =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...change } : q)));

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      toast.show({ message: 'Application link copied', tone: 'ok' });
    } catch {
      toast.show({ message: `Copy failed. Link: ${link}`, tone: 'error' });
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Icon icon={Settings2} />
        Application form
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        variant="drawer"
        title="Application form"
        description="What a visitor sees at your public link. Name, email, goal, training days and experience are always asked."
        form={{ action }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">Save form</SubmitButton>
          </>
        }
      >
        <div className="space-y-5">
          <input type="hidden" name="questions" value={JSON.stringify(questions)} />
          <div>
            <Label htmlFor="intake-slug">Public link</Label>
            <div className="flex gap-2">
              <Input id="intake-slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required minLength={3} maxLength={40} className="font-mono" />
              <Button variant="secondary" aria-label="Copy application link" className="w-9 shrink-0 px-0" onClick={() => void copy()}>
                <Icon icon={Copy} />
              </Button>
            </div>
            <p className="mt-1 break-all font-mono text-meta text-muted">{link}</p>
          </div>
          <div>
            <Label htmlFor="intake-headline">Headline</Label>
            <Input id="intake-headline" name="headline" defaultValue={form.headline} required maxLength={INTAKE_LIMITS.maxHeadline} />
          </div>
          <div>
            <Label htmlFor="intake-intro">Intro</Label>
            <textarea
              id="intake-intro"
              name="intro"
              rows={3}
              maxLength={INTAKE_LIMITS.maxIntro}
              defaultValue={form.intro}
              className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink hover:border-faint"
            />
          </div>
          <label className="flex items-center gap-2 text-ui">
            <input type="checkbox" name="acceptingLeads" defaultChecked={form.acceptingLeads} />
            Accepting applications
          </label>

          <fieldset className="space-y-3">
            <legend className="mb-1 font-mono text-micro uppercase text-muted">
              Custom questions ({questions.length}/{INTAKE_LIMITS.maxQuestions})
            </legend>
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2 rounded border border-line p-3">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`q-label-${q.id}`}>Question {i + 1}</Label>
                    <Input id={`q-label-${q.id}`} value={q.label} maxLength={INTAKE_LIMITS.maxLabel} onChange={(e) => patch(i, { label: e.target.value })} />
                  </div>
                  <Button variant="ghost" size="sm" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => setQuestions((qs) => reorder(qs, i, i - 1))}>
                    <Icon icon={ArrowUp} />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => setQuestions((qs) => reorder(qs, i, i + 1))}>
                    <Icon icon={ArrowDown} />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Remove question ${i + 1}`} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                    <Icon icon={Trash2} />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    aria-label={`Answer type for question ${i + 1}`}
                    value={q.type}
                    onChange={(e) => {
                      const type = e.target.value as IntakeQuestion['type'];
                      patch(i, { type, options: type === IntakeQuestionType.CHOICE ? (q.options?.length ? q.options : ['', '']) : undefined });
                    }}
                  >
                    <option value={IntakeQuestionType.TEXT}>Free text</option>
                    <option value={IntakeQuestionType.CHOICE}>Pick one</option>
                  </Select>
                  <label className="flex items-center gap-2 text-ui">
                    <input type="checkbox" checked={q.required} onChange={(e) => patch(i, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
                {q.type === IntakeQuestionType.CHOICE ? (
                  <div>
                    <Label htmlFor={`q-options-${q.id}`}>Options, one per line</Label>
                    <textarea
                      id={`q-options-${q.id}`}
                      rows={3}
                      value={(q.options ?? []).join('\n')}
                      onChange={(e) => patch(i, { options: e.target.value.split('\n').slice(0, INTAKE_LIMITS.maxOptions) })}
                      className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink hover:border-faint"
                    />
                  </div>
                ) : null}
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              disabled={questions.length >= INTAKE_LIMITS.maxQuestions}
              onClick={() => setQuestions((qs) => [...qs, { id: newId(), label: '', required: false, type: IntakeQuestionType.TEXT }])}
            >
              <Icon icon={Plus} />
              Add question
            </Button>
          </fieldset>
          <FormError>{state && !state.ok ? state.error : undefined}</FormError>
        </div>
      </Sheet>
    </>
  );
}
