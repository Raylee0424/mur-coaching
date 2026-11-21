import 'server-only';
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  BulkResolveRequest,
  BulkResolveResponse,
  ClientOverviewDto,
  CreateInviteRequest,
  CreateInviteResponse,
  DuplicateProgramRequest,
  ExerciseAlternativesDto,
  ExplainDto,
  ForgotPasswordRequest,
  InviteDto,
  InvitePreviewDto,
  NextTargetsDto,
  RecommendationQueueQuery,
  RecommendationQueueResponse,
  ResetPasswordRequest,
  RosterQuery,
  RosterSummaryDto,
  SignupRequest,
  TodayDto,
  VerifyEmailRequest,
  BaselineInput,
  ClientProfileDto,
  MeProfileDto,
  UpdateWorkoutLogRequest,
  AssignmentDto,
  CreateAssignmentRequest,
  ProgramDto,
  ProgramSummaryDto,
  ProgramTreeInput,
  ClientSettingsDto,
  CoachEngineRulesDto,
  EnginePreviewRequest,
  EnginePreviewResponse,
  OverrideRecommendationRequest,
  UpdateClientRequest,
  UpdateClientSettingsRequest,
  UpdateCoachEngineRulesRequest,
  AuthTokenResponse,
  AuthUser,
  ClientView,
  CreateClientRequest,
  CreateClientResponse,
  CreateExerciseRequest,
  CreateWorkoutLogRequest,
  ExerciseDto,
  ListExercisesQuery,
  ListWorkoutLogsQuery,
  Paginated,
  ProgressionHistoryResponse,
  RecommendationDto,
  ResolvableStatus,
  Role,
  UpdateExerciseRequest,
  UpdateMeRequest,
  WorkoutLogDto,
} from '@coaching/shared';
import { apiFetch } from './client';

/** One typed function per live endpoint. Pages and actions use these, never apiFetch directly. */
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthTokenResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  demo: (role: Role) =>
    apiFetch<AuthTokenResponse>('/auth/demo', { method: 'POST', body: { role }, auth: false }),
  signup: (body: SignupRequest) =>
    apiFetch<AuthTokenResponse>('/auth/signup', { method: 'POST', body, auth: false }),
  /** Signed-in user confirms the 6-digit emailed code. */
  verifyEmail: (body: VerifyEmailRequest) => apiFetch<AuthUser>('/auth/verify-email', { method: 'POST', body }),
  resendVerification: () => apiFetch<void>('/auth/verify-email/resend', { method: 'POST' }),
  /** Always 204, whether or not the email exists. */
  forgotPassword: (body: ForgotPasswordRequest) =>
    apiFetch<void>('/auth/forgot-password', { method: 'POST', body, auth: false }),
  resetPassword: (body: ResetPasswordRequest) =>
    apiFetch<void>('/auth/reset-password', { method: 'POST', body, auth: false }),
  me: () => apiFetch<AuthUser>('/auth/me'),
  updateMe: (body: UpdateMeRequest) => apiFetch<AuthUser>('/me', { method: 'PATCH', body }),
};

/** Public: the link a client opens. 404 unknown, 410 expired or already used. */
export const invitesApi = {
  preview: (token: string) => apiFetch<InvitePreviewDto>(`/invites/${encodeURIComponent(token)}`, { auth: false }),
  accept: (token: string, body: AcceptInviteRequest) =>
    apiFetch<AcceptInviteResponse>(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', body, auth: false }),
};

export const clientsApi = {
  list: () => apiFetch<ClientView[]>('/clients'),
  /** Roster with per-client stats, KPIs and filter counts. */
  summary: (query?: RosterQuery) =>
    apiFetch<RosterSummaryDto>('/clients/summary', {
      query: {
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.needsAttention ? { needsAttention: 'true' } : {}),
        ...(query?.q ? { q: query.q } : {}),
      },
    }),
  overview: (clientId: string, month?: string) =>
    apiFetch<ClientOverviewDto>(`/clients/${encodeURIComponent(clientId)}/overview`, { query: { month } }),
  listInvites: () => apiFetch<InviteDto[]>('/clients/invites'),
  createInvite: (body: CreateInviteRequest) =>
    apiFetch<CreateInviteResponse>('/clients/invites', { method: 'POST', body }),
  revokeInvite: (id: string) => apiFetch<void>(`/clients/invites/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  get: (clientId: string) => apiFetch<ClientView>(`/clients/${encodeURIComponent(clientId)}`),
  create: (body: CreateClientRequest) =>
    apiFetch<CreateClientResponse>('/clients', { method: 'POST', body }),
  update: (clientId: string, body: UpdateClientRequest) =>
    apiFetch<ClientView>(`/clients/${encodeURIComponent(clientId)}`, { method: 'PATCH', body }),
  settings: (clientId: string) => apiFetch<ClientSettingsDto>(`/clients/${encodeURIComponent(clientId)}/settings`),
  updateSettings: (clientId: string, body: UpdateClientSettingsRequest) =>
    apiFetch<ClientSettingsDto>(`/clients/${encodeURIComponent(clientId)}/settings`, { method: 'PUT', body }),
};

export const engineRulesApi = {
  get: () => apiFetch<CoachEngineRulesDto>('/coach/engine-rules'),
  replace: (body: UpdateCoachEngineRulesRequest) =>
    apiFetch<CoachEngineRulesDto>('/coach/engine-rules', { method: 'PUT', body }),
  reset: () => apiFetch<CoachEngineRulesDto>('/coach/engine-rules', { method: 'DELETE' }),
  preview: (body: EnginePreviewRequest) =>
    apiFetch<EnginePreviewResponse>('/coach/engine-rules/preview', { method: 'POST', body }),
};

export const exercisesApi = {
  list: (query?: ListExercisesQuery) => apiFetch<ExerciseDto[]>('/exercises', { ...(query ? { query: { ...query } } : {}) }),
  create: (body: CreateExerciseRequest) => apiFetch<ExerciseDto>('/exercises', { method: 'POST', body }),
  update: (id: string, body: UpdateExerciseRequest) =>
    apiFetch<ExerciseDto>(`/exercises/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  duplicate: (id: string) => apiFetch<ExerciseDto>(`/exercises/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }),
  /** Soft archive (coach-owned only). */
  archive: (id: string) => apiFetch<void>(`/exercises/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /** Client swap picker. */
  alternatives: (id: string) => apiFetch<ExerciseAlternativesDto>(`/exercises/${encodeURIComponent(id)}/alternatives`),
};

export const workoutLogsApi = {
  create: (body: CreateWorkoutLogRequest) =>
    apiFetch<WorkoutLogDto>('/workout-logs', { method: 'POST', body }),
  listForClient: (clientId: string, query?: ListWorkoutLogsQuery) =>
    apiFetch<Paginated<WorkoutLogDto>>(`/clients/${encodeURIComponent(clientId)}/workout-logs`, {
      ...(query ? { query: { ...query } } : {}),
    }),
  update: (id: string, body: UpdateWorkoutLogRequest) =>
    apiFetch<WorkoutLogDto>(`/workout-logs/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id: string) => apiFetch<void>(`/workout-logs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /** Session-complete screen: next targets per exercise after the engine re-evaluated. */
  nextTargets: (id: string) => apiFetch<NextTargetsDto>(`/workout-logs/${encodeURIComponent(id)}/next-targets`),
};

export const progressionApi = {
  latest: (clientId: string) =>
    apiFetch<RecommendationDto[]>(`/clients/${encodeURIComponent(clientId)}/progression`),
  history: (clientId: string, exerciseId: string) =>
    apiFetch<ProgressionHistoryResponse>(
      `/clients/${encodeURIComponent(clientId)}/progression/${encodeURIComponent(exerciseId)}`,
    ),
  evaluateAll: (clientId: string) =>
    apiFetch<RecommendationDto[]>(`/clients/${encodeURIComponent(clientId)}/progression/evaluate`, {
      method: 'POST',
    }),
  evaluateOne: (clientId: string, exerciseId: string) =>
    apiFetch<RecommendationDto>(
      `/clients/${encodeURIComponent(clientId)}/progression/${encodeURIComponent(exerciseId)}/evaluate`,
      { method: 'POST' },
    ),
  /** Coach-wide queue across own ACTIVE clients. */
  queue: (query?: RecommendationQueueQuery) =>
    apiFetch<RecommendationQueueResponse>('/progression/recommendations', {
      query: { status: query?.status, action: query?.action, q: query?.q },
    }),
  bulkResolve: (body: BulkResolveRequest) =>
    apiFetch<BulkResolveResponse>('/progression/recommendations/bulk', { method: 'POST', body }),
  /** "Why this call": coach, or the client it belongs to. */
  explain: (recommendationId: string) =>
    apiFetch<ExplainDto>(`/progression/recommendations/${encodeURIComponent(recommendationId)}/explain`),
  override: (recommendationId: string, body: OverrideRecommendationRequest) =>
    apiFetch<RecommendationDto>(`/progression/recommendations/${encodeURIComponent(recommendationId)}/override`, {
      method: 'PATCH',
      body,
    }),
  resolve: (recommendationId: string, status: ResolvableStatus) =>
    apiFetch<RecommendationDto>(`/progression/recommendations/${encodeURIComponent(recommendationId)}`, {
      method: 'PATCH',
      body: { status },
    }),
};

export const programsApi = {
  /** `template: true` = templates only, `false` = regular programs only, omitted = all. */
  list: (opts?: { template?: boolean }) =>
    apiFetch<ProgramSummaryDto[]>('/programs', {
      query: { template: opts?.template === undefined ? undefined : String(opts.template) },
    }),
  /** Copy a program; `{ asTemplate: true }` saves it as a template. */
  duplicate: (id: string, body: DuplicateProgramRequest = {}) =>
    apiFetch<ProgramDto>(`/programs/${encodeURIComponent(id)}/duplicate`, { method: 'POST', body }),
  get: (id: string) => apiFetch<ProgramDto>(`/programs/${encodeURIComponent(id)}`),
  create: (body: ProgramTreeInput) => apiFetch<ProgramDto>('/programs', { method: 'POST', body }),
  replace: (id: string, body: ProgramTreeInput) =>
    apiFetch<ProgramDto>(`/programs/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  remove: (id: string) => apiFetch<void>(`/programs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assign: (clientId: string, body: CreateAssignmentRequest) =>
    apiFetch<AssignmentDto>(`/clients/${encodeURIComponent(clientId)}/assignments`, { method: 'POST', body }),
};

export const meApi = {
  /** Client home: today's workout with targets, banner and last session id. */
  today: () => apiFetch<TodayDto>('/me/today'),
  profile: () => apiFetch<MeProfileDto>('/me/profile'),
  updateProfile: (body: Partial<ClientProfileDto>) => apiFetch<MeProfileDto>('/me/profile', { method: 'PUT', body }),
  setBaselines: (baselines: BaselineInput[]) =>
    apiFetch<MeProfileDto>('/me/baselines', { method: 'PUT', body: { baselines } }),
  completeOnboarding: () => apiFetch<AuthUser>('/me/onboarding/complete', { method: 'POST' }),
};
