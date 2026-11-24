'use client';

import { CHECK_IN_KIND_LABELS, CHECK_IN_LIMITS, CheckInQuestionKind } from '@coaching/shared';
import type { CheckInQuestionInput, CheckInTemplateDto } from '@coaching/shared';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveCheckInTemplate } from '@/actions/check-ins';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { blankQuestion, canAddQuestion, moveQuestion } from './check-ins-model';

/** Create (no `template`) or edit a questionnaire. Saving replaces every question. */
export function TemplateEditor({ template }: { template?: CheckInTemplateDto }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(template?.title ?? '');
  const [questions, setQuestions] = useState<CheckInQuestionInput[]>(
    template?.questions.map(({ prompt, kind, required, unit }) => ({ prompt, kind, required, unit })) ?? [blankQuestion()],
  );
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<CheckInQuestionInput>): void =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  function save(): void {
    setError(undefined);
    start(async () => {
      const res = await saveCheckInTemplate(template?.id ?? null, {
        title: title.trim(),
        questions: questions.map((q) => ({ ...q, prompt: q.prompt.trim(), unit: q.kind === CheckInQuestionKind.NUMBER ? q.unit?.trim() || null : null })),
      });
      if (!res.ok) return setError(res.error);
      toast.show({ message: template ? 'Check-in updated' : 'Check-in created', tone: 'ok' });
      setOpen(false);
      if (!template) {
        setTitle('');
        setQuestions([blankQuestion()]);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant={template ? 'secondary' : 'primary'} onClick={() => setOpen(true)}>
        {template ? 'Edit questions' : (
          <>
            <Icon icon={Plus} /> New check-in
          </>
        )}
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        variant="drawer"
        title={template ? 'Edit check-in' : 'New check-in'}
        description="Answers already submitted keep the wording they were given."
        form={{ action: save }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <Label htmlFor="ci-title">Title</Label>
            <Input id="ci-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={CHECK_IN_LIMITS.maxTitle} placeholder="Weekly Sunday check-in" />
          </div>
          <ol className="space-y-4">
            {questions.map((q, i) => (
              <li key={i} className="space-y-3 rounded-md border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-micro uppercase text-muted">Question {i + 1}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setQuestions((qs) => moveQuestion(qs, i, -1))} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>
                      <Icon icon={ArrowUp} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setQuestions((qs) => moveQuestion(qs, i, 1))} disabled={i === questions.length - 1} aria-label={`Move question ${i + 1} down`}>
                      <Icon icon={ArrowDown} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} disabled={questions.length === 1} aria-label={`Remove question ${i + 1}`}>
                      <Icon icon={Trash2} />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`ci-q${i}`}>Prompt</Label>
                  <Input id={`ci-q${i}`} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} required maxLength={CHECK_IN_LIMITS.maxPrompt} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`ci-k${i}`}>Answer type</Label>
                    <Select id={`ci-k${i}`} value={q.kind} onChange={(e) => update(i, { kind: e.target.value as CheckInQuestionKind })}>
                      {Object.values(CheckInQuestionKind).map((k) => (
                        <option key={k} value={k}>
                          {CHECK_IN_KIND_LABELS[k]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {q.kind === CheckInQuestionKind.NUMBER ? (
                    <div>
                      <Label htmlFor={`ci-u${i}`}>Unit (optional)</Label>
                      <Input id={`ci-u${i}`} value={q.unit ?? ''} onChange={(e) => update(i, { unit: e.target.value })} maxLength={CHECK_IN_LIMITS.maxUnit} placeholder="kg" />
                    </div>
                  ) : null}
                </div>
                <label className="flex min-h-11 items-center gap-2 text-ui">
                  <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} className="size-4" />
                  Required
                </label>
              </li>
            ))}
          </ol>
          <Button variant="secondary" size="sm" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])} disabled={!canAddQuestion(questions.length)}>
            <Icon icon={Plus} /> Add question
          </Button>
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
