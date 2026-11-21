import 'server-only';
import type {
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
};

export const clientsApi = {
  list: () => apiFetch<ClientView[]>('/clients'),
  get: (clientId: string) => apiFetch<ClientView>(`/clients/${encodeURIComponent(clientId)}`),
  create: (body: CreateClientRequest) =>
    apiFetch<CreateClientResponse>('/clients', { method: 'POST', body }),
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
  resolve: (recommendationId: string, status: ResolvableStatus) =>
    apiFetch<RecommendationDto>(`/progression/recommendations/${encodeURIComponent(recommendationId)}`, {
      method: 'PATCH',
      body: { status },
    }),
};
