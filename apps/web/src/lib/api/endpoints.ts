import 'server-only';
import type {
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
  me: () => apiFetch<AuthUser>('/auth/me'),
  updateMe: (body: UpdateMeRequest) => apiFetch<AuthUser>('/me', { method: 'PATCH', body }),
};

export const clientsApi = {
  list: () => apiFetch<ClientView[]>('/clients'),
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
  list: () => apiFetch<ProgramSummaryDto[]>('/programs'),
  get: (id: string) => apiFetch<ProgramDto>(`/programs/${encodeURIComponent(id)}`),
  create: (body: ProgramTreeInput) => apiFetch<ProgramDto>('/programs', { method: 'POST', body }),
  replace: (id: string, body: ProgramTreeInput) =>
    apiFetch<ProgramDto>(`/programs/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  remove: (id: string) => apiFetch<void>(`/programs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assign: (clientId: string, body: CreateAssignmentRequest) =>
    apiFetch<AssignmentDto>(`/clients/${encodeURIComponent(clientId)}/assignments`, { method: 'POST', body }),
};

export const meApi = {
  profile: () => apiFetch<MeProfileDto>('/me/profile'),
  updateProfile: (body: Partial<ClientProfileDto>) => apiFetch<MeProfileDto>('/me/profile', { method: 'PUT', body }),
  setBaselines: (baselines: BaselineInput[]) =>
    apiFetch<MeProfileDto>('/me/baselines', { method: 'PUT', body: { baselines } }),
  completeOnboarding: () => apiFetch<AuthUser>('/me/onboarding/complete', { method: 'POST' }),
};
