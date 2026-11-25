import 'server-only';
import type {
  GroupDetailDto,
  GroupLeaderboardDto,
  SharedWorkoutDto,
  SocialOverviewDto,
  CreateGroupRequest,
  CreateReportRequest,
  ShareWorkoutRequest,
  HealthOverviewDto,
  SyncHealthMetricsRequest,
  SyncHealthMetricsResponse,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportJobDto,
  ImportPreviewDto,
  ImportPreviewRequest,
  CycleContextDto,
  MuscleAnalyticsDto,
  ReadinessDto,
  ReadinessHistoryDto,
  SaveCycleEntryRequest,
  SaveReadinessRequest,
  CoachNutritionDto,
  FoodDto,
  LogMealRequest,
  LogWaterRequest,
  MealEntryDto,
  MealPlanDto,
  MealTemplateDto,
  NutritionDayDto,
  NutritionLibraryDto,
  NutritionTargetDto,
  SaveFoodRequest,
  SaveMealPlanRequest,
  SaveMealTemplateRequest,
  SaveNutritionTargetRequest,
  WaterLogDto,
  AutomationCandidateDto,
  AutomationRuleDto,
  AutomationsDto,
  AvailabilityDto,
  BookingDto,
  ClientCallsDto,
  ClientVideosDto,
  CoachLiveDto,
  CoachScheduleDto,
  CreateAnnotationRequest,
  CreateBookingRequest,
  CreateReviewAudioRequest,
  CreateSetVideoRequest,
  FormCheckQueueDto,
  LiveSessionDto,
  LogLiveSetRequest,
  RunAutomationsResultDto,
  SaveAutomationRuleRequest,
  SaveAvailabilityRequest,
  StartLiveSessionRequest,
  UpdateBookingRequest,
  UploadTicketDto,
  VideoAnnotationDto,
  BodyTrendDto,
  CheckInInboxDto,
  CheckInResponseDto,
  CheckInTemplateDto,
  ClientCheckInsDto,
  ClientPhotosDto,
  CoachInboxDto,
  CoachProgressDto,
  CreateCheckInScheduleRequest,
  CreateProgressPhotoRequest,
  CreateProgressPhotoResponse,
  LogBodyweightRequest,
  MessageDto,
  MessageThreadDto,
  ReviewCheckInRequest,
  SaveBodyGoalRequest,
  SaveCheckInTemplateRequest,
  SubmitCheckInRequest,
  ThreadQuery,
  ClientResourceDto,
  CreateLeadRequest,
  CreateResourceRequest,
  CreateResourceResponse,
  IntakeFormDto,
  LeadBoardDto,
  LeadDto,
  PublicIntakeDto,
  ResourceDto,
  ResourceLibraryDto,
  RoadmapDto,
  RoadmapInput,
  SaveIntakeFormRequest,
  ShareResourceRequest,
  SubmitIntakeRequest,
  UpdateLeadRequest,
  CheckoutRequest,
  ClientOffersDto,
  CoachBillingDto,
  CoachOfferDto,
  CreateCoachOfferRequest,
  EntitlementsDto,
  RedirectUrlDto,
  AcceptInviteRequest,
  ClientGroupDto,
  CreateSessionFeedbackRequest,
  GroupAssignOutcome,
  GroupAssignRequest,
  ProgramShareDto,
  SaveClientGroupRequest,
  ScheduledWorkoutDto,
  SessionFeedbackDto,
  SessionReviewDto,
  SharedProgramDto,
  SportCategoryDto,
  UpdateScheduledWorkoutRequest,
  UpdateSessionFeedbackRequest,
  AcceptInviteResponse,
  BulkResolveRequest,
  BulkResolveResponse,
  ClientOverviewDto,
  CreateInviteRequest,
  CreateInviteResponse,
  ClientProgramConflictsDto,
  CreateLimitationRequest,
  LimitationDto,
  UpdateLimitationRequest,
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
  CreateExerciseNoteRequest,
  ExerciseStatsDto,
  RecordsDto,
  CreateWorkoutTemplateRequest,
  ExerciseNoteDto,
  TemplateFolderDto,
  TemplateFolderRequest,
  UpdateExerciseNoteRequest,
  UpdateWorkoutTemplateRequest,
  WorkoutTemplateDto,
  AiConversationDto,
  AskCoachRequest,
  AskCoachResponse,
  CoachOverviewDto,
  ConnectorGrantDto,
  CreateConnectorRequest,
  CreatedConnectorDto,
  GeneratedWorkoutDto,
  GenerateWorkoutRequest,
  VoiceParseResponse,
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
  /** Athlete's own net progression and records for one exercise. */
  stats: (id: string) => apiFetch<ExerciseStatsDto>(`/exercises/${encodeURIComponent(id)}/stats`),
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
  /** Advisory limitation conflicts: for `clientIds`, or for every client actively assigned when omitted. */
  conflicts: (id: string, clientIds?: readonly string[]) =>
    apiFetch<ClientProgramConflictsDto[]>(`/programs/${encodeURIComponent(id)}/conflicts`, {
      query: { clientIds: clientIds && clientIds.length > 0 ? clientIds.join(',') : undefined },
    }),
};

export const programSharingApi = {
  /** Mints (or replaces) the read-only preview link. The token comes back once. */
  create: (id: string) => apiFetch<ProgramShareDto>(`/programs/${encodeURIComponent(id)}/share`, { method: 'POST' }),
  revoke: (id: string) => apiFetch<void>(`/programs/${encodeURIComponent(id)}/share`, { method: 'DELETE' }),
  /** Public: the link is the credential. 404 when unknown or revoked. */
  preview: (token: string) => apiFetch<SharedProgramDto>(`/shared-programs/${encodeURIComponent(token)}`, { auth: false }),
};

export const sportsApi = {
  list: () => apiFetch<SportCategoryDto[]>('/sport-categories'),
};

export const clientGroupsApi = {
  list: () => apiFetch<ClientGroupDto[]>('/client-groups'),
  create: (body: SaveClientGroupRequest) => apiFetch<ClientGroupDto>('/client-groups', { method: 'POST', body }),
  replace: (id: string, body: SaveClientGroupRequest) =>
    apiFetch<ClientGroupDto>(`/client-groups/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  remove: (id: string) => apiFetch<void>(`/client-groups/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assign: (id: string, body: GroupAssignRequest) =>
    apiFetch<GroupAssignOutcome[]>(`/client-groups/${encodeURIComponent(id)}/assign`, { method: 'POST', body }),
};

export const scheduleApi = {
  update: (clientId: string, id: string, body: UpdateScheduledWorkoutRequest) =>
    apiFetch<ScheduledWorkoutDto>(`/clients/${encodeURIComponent(clientId)}/scheduled-workouts/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
};

export const sessionReviewApi = {
  get: (clientId: string, logId: string) =>
    apiFetch<SessionReviewDto>(`/clients/${encodeURIComponent(clientId)}/workout-logs/${encodeURIComponent(logId)}/review`),
  addFeedback: (clientId: string, logId: string, body: CreateSessionFeedbackRequest) =>
    apiFetch<SessionFeedbackDto>(`/clients/${encodeURIComponent(clientId)}/workout-logs/${encodeURIComponent(logId)}/feedback`, { method: 'POST', body }),
  updateFeedback: (clientId: string, id: string, body: UpdateSessionFeedbackRequest) =>
    apiFetch<SessionFeedbackDto>(`/clients/${encodeURIComponent(clientId)}/session-feedback/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  removeFeedback: (clientId: string, id: string) =>
    apiFetch<void>(`/clients/${encodeURIComponent(clientId)}/session-feedback/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const meApi = {
  /** Client home: today's workout with targets, banner and last session id. */
  today: () => apiFetch<TodayDto>('/me/today'),
  /** Rep-range PR matrix and 30-day stats per exercise. */
  records: () => apiFetch<RecordsDto>('/me/records'),
  profile: () => apiFetch<MeProfileDto>('/me/profile'),
  updateProfile: (body: Partial<ClientProfileDto>) => apiFetch<MeProfileDto>('/me/profile', { method: 'PUT', body }),
  setBaselines: (baselines: BaselineInput[]) =>
    apiFetch<MeProfileDto>('/me/baselines', { method: 'PUT', body: { baselines } }),
  completeOnboarding: () => apiFetch<AuthUser>('/me/onboarding/complete', { method: 'POST' }),
};

/** Injuries and limitations. The same routes serve the coach (tenancy-checked) and the client (own id). */
export const limitationsApi = {
  list: (clientId: string, active = false) =>
    apiFetch<LimitationDto[]>(`/clients/${encodeURIComponent(clientId)}/limitations`, { query: active ? { active: 'true' } : {} }),
  create: (clientId: string, body: CreateLimitationRequest) =>
    apiFetch<LimitationDto>(`/clients/${encodeURIComponent(clientId)}/limitations`, { method: 'POST', body }),
  update: (clientId: string, id: string, body: UpdateLimitationRequest) =>
    apiFetch<LimitationDto>(`/clients/${encodeURIComponent(clientId)}/limitations/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (clientId: string, id: string) =>
    apiFetch<void>(`/clients/${encodeURIComponent(clientId)}/limitations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

const idPath = (base: `/${string}`, id: string): `/${string}` => `${base}/${encodeURIComponent(id)}`;

export const templatesApi = {
  listFolders: () => apiFetch<TemplateFolderDto[]>('/template-folders'),
  createFolder: (body: TemplateFolderRequest) => apiFetch<TemplateFolderDto>('/template-folders', { method: 'POST', body }),
  renameFolder: (id: string, body: TemplateFolderRequest) =>
    apiFetch<TemplateFolderDto>(idPath('/template-folders', id), { method: 'PATCH', body }),
  removeFolder: (id: string) => apiFetch<void>(idPath('/template-folders', id), { method: 'DELETE' }),
  list: (folderId?: string) => apiFetch<WorkoutTemplateDto[]>('/workout-templates', { query: folderId ? { folderId } : {} }),
  get: (id: string) => apiFetch<WorkoutTemplateDto>(idPath('/workout-templates', id)),
  create: (body: CreateWorkoutTemplateRequest) => apiFetch<WorkoutTemplateDto>('/workout-templates', { method: 'POST', body }),
  update: (id: string, body: UpdateWorkoutTemplateRequest) =>
    apiFetch<WorkoutTemplateDto>(idPath('/workout-templates', id), { method: 'PATCH', body }),
  remove: (id: string) => apiFetch<void>(idPath('/workout-templates', id), { method: 'DELETE' }),
};

export const exerciseNotesApi = {
  list: (exerciseId?: string) => apiFetch<ExerciseNoteDto[]>('/exercise-notes', { query: exerciseId ? { exerciseId } : {} }),
  create: (body: CreateExerciseNoteRequest) => apiFetch<ExerciseNoteDto>('/exercise-notes', { method: 'POST', body }),
  update: (id: string, body: UpdateExerciseNoteRequest) =>
    apiFetch<ExerciseNoteDto>(idPath('/exercise-notes', id), { method: 'PATCH', body }),
  remove: (id: string) => apiFetch<void>(idPath('/exercise-notes', id), { method: 'DELETE' }),
};

export const billingApi = {
  entitlements: () => apiFetch<EntitlementsDto>('/me/entitlements'),
  checkout: (body: CheckoutRequest) => apiFetch<RedirectUrlDto>('/billing/checkout', { method: 'POST', body }),
  portal: () => apiFetch<RedirectUrlDto>('/billing/portal', { method: 'POST' }),
  coachOverview: () => apiFetch<CoachBillingDto>('/coach/billing'),
  connect: () => apiFetch<RedirectUrlDto>('/coach/billing/connect', { method: 'POST' }),
  dashboard: () => apiFetch<RedirectUrlDto>('/coach/billing/dashboard', { method: 'POST' }),
  createOffer: (body: CreateCoachOfferRequest) => apiFetch<CoachOfferDto>('/coach/offers', { method: 'POST', body }),
  archiveOffer: (id: string) => apiFetch<void>(`/coach/offers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clientOffers: () => apiFetch<ClientOffersDto>('/me/offers'),
  checkoutOffer: (id: string) => apiFetch<RedirectUrlDto>(`/me/offers/${encodeURIComponent(id)}/checkout`, { method: 'POST' }),
};

export const leadsApi = {
  board: () => apiFetch<LeadBoardDto>('/coach/leads'),
  create: (body: CreateLeadRequest) => apiFetch<LeadDto>('/coach/leads', { method: 'POST', body }),
  update: (id: string, body: UpdateLeadRequest) => apiFetch<LeadDto>(idPath('/coach/leads', id), { method: 'PATCH', body }),
  remove: (id: string) => apiFetch<void>(idPath('/coach/leads', id), { method: 'DELETE' }),
  form: () => apiFetch<IntakeFormDto>('/coach/intake-form'),
  saveForm: (body: SaveIntakeFormRequest) => apiFetch<IntakeFormDto>('/coach/intake-form', { method: 'PUT', body }),
};

/** Public: the application form a visitor opens at /apply/<slug>. */
export const intakeApi = {
  preview: (slug: string) => apiFetch<PublicIntakeDto>(idPath('/intake', slug), { auth: false }),
  submit: (slug: string, body: SubmitIntakeRequest) =>
    apiFetch<{ received: true }>(idPath('/intake', slug), { method: 'POST', body, auth: false }),
};

export const resourcesApi = {
  library: () => apiFetch<ResourceLibraryDto>('/coach/resources'),
  create: (body: CreateResourceRequest) => apiFetch<CreateResourceResponse>('/coach/resources', { method: 'POST', body }),
  complete: (id: string) => apiFetch<ResourceDto>(`${idPath('/coach/resources', id)}/complete`, { method: 'POST' }),
  share: (id: string, body: ShareResourceRequest) => apiFetch<ResourceDto>(`${idPath('/coach/resources', id)}/shares`, { method: 'PUT', body }),
  url: (id: string) => apiFetch<RedirectUrlDto>(`${idPath('/coach/resources', id)}/url`),
  remove: (id: string) => apiFetch<void>(idPath('/coach/resources', id), { method: 'DELETE' }),
  mine: () => apiFetch<ClientResourceDto[]>('/me/resources'),
  mineUrl: (id: string) => apiFetch<RedirectUrlDto>(`${idPath('/me/resources', id)}/url`),
};

export const roadmapApi = {
  forClient: (clientId: string) => apiFetch<RoadmapDto | null>(`${idPath('/clients', clientId)}/roadmap`),
  save: (clientId: string, body: RoadmapInput) => apiFetch<RoadmapDto>(`${idPath('/clients', clientId)}/roadmap`, { method: 'PUT', body }),
  remove: (clientId: string) => apiFetch<void>(`${idPath('/clients', clientId)}/roadmap`, { method: 'DELETE' }),
  mine: () => apiFetch<RoadmapDto | null>('/me/roadmap'),
};

export const messagingApi = {
  inbox: () => apiFetch<CoachInboxDto>('/coach/conversations'),
  thread: (clientId: string, query: ThreadQuery = {}) => apiFetch<MessageThreadDto>(`${idPath('/coach/conversations', clientId)}/messages`, { query: { ...query } }),
  send: (clientId: string, body: string) => apiFetch<MessageDto>(`${idPath('/coach/conversations', clientId)}/messages`, { method: 'POST', body: { body } }),
  read: (clientId: string) => apiFetch<void>(`${idPath('/coach/conversations', clientId)}/read`, { method: 'POST' }),
  myThread: (query: ThreadQuery = {}) => apiFetch<MessageThreadDto>('/me/conversation/messages', { query: { ...query } }),
  sendMine: (body: string) => apiFetch<MessageDto>('/me/conversation/messages', { method: 'POST', body: { body } }),
  readMine: () => apiFetch<void>('/me/conversation/read', { method: 'POST' }),
};

export const checkInsApi = {
  inbox: () => apiFetch<CheckInInboxDto>('/coach/check-ins'),
  review: (id: string, body: ReviewCheckInRequest) => apiFetch<void>(idPath('/coach/check-ins', id), { method: 'PATCH', body }),
  createTemplate: (body: SaveCheckInTemplateRequest) => apiFetch<CheckInTemplateDto>('/coach/check-in-templates', { method: 'POST', body }),
  updateTemplate: (id: string, body: SaveCheckInTemplateRequest) => apiFetch<CheckInTemplateDto>(idPath('/coach/check-in-templates', id), { method: 'PUT', body }),
  removeTemplate: (id: string) => apiFetch<void>(idPath('/coach/check-in-templates', id), { method: 'DELETE' }),
  assign: (body: CreateCheckInScheduleRequest) => apiFetch<CheckInTemplateDto>('/coach/check-in-schedules', { method: 'POST', body }),
  unassign: (id: string) => apiFetch<void>(idPath('/coach/check-in-schedules', id), { method: 'DELETE' }),
  mine: () => apiFetch<ClientCheckInsDto>('/me/check-ins'),
  submit: (scheduleId: string, body: SubmitCheckInRequest) => apiFetch<CheckInResponseDto>(idPath('/me/check-ins', scheduleId), { method: 'POST', body }),
};

export const bodyApi = {
  trend: () => apiFetch<BodyTrendDto>('/me/body'),
  log: (body: LogBodyweightRequest) => apiFetch<void>('/me/body/entries', { method: 'PUT', body }),
  removeEntry: (date: string) => apiFetch<void>(idPath('/me/body/entries', date), { method: 'DELETE' }),
  saveGoal: (body: SaveBodyGoalRequest) => apiFetch<void>('/me/body/goal', { method: 'PUT', body }),
  removeGoal: () => apiFetch<void>('/me/body/goal', { method: 'DELETE' }),
  photos: () => apiFetch<ClientPhotosDto>('/me/progress-photos'),
  reservePhoto: (body: CreateProgressPhotoRequest) => apiFetch<CreateProgressPhotoResponse>('/me/progress-photos', { method: 'POST', body }),
  completePhoto: (id: string) => apiFetch<void>(`${idPath('/me/progress-photos', id)}/complete`, { method: 'POST' }),
  sharePhoto: (id: string, sharedWithCoach: boolean) => apiFetch<void>(idPath('/me/progress-photos', id), { method: 'PATCH', body: { sharedWithCoach } }),
  removePhoto: (id: string) => apiFetch<void>(idPath('/me/progress-photos', id), { method: 'DELETE' }),
  clientProgress: (clientId: string) => apiFetch<CoachProgressDto>(`${idPath('/clients', clientId)}/progress`),
};

export const videosApi = {
  mine: () => apiFetch<ClientVideosDto>('/me/set-videos'),
  reserve: (body: CreateSetVideoRequest) => apiFetch<UploadTicketDto>('/me/set-videos', { method: 'POST', body }),
  complete: (id: string) => apiFetch<void>(`${idPath('/me/set-videos', id)}/complete`, { method: 'POST' }),
  requestReview: (id: string) => apiFetch<void>(`${idPath('/me/set-videos', id)}/form-check`, { method: 'POST' }),
  remove: (id: string) => apiFetch<void>(idPath('/me/set-videos', id), { method: 'DELETE' }),
};

export const formChecksApi = {
  queue: () => apiFetch<FormCheckQueueDto>('/coach/form-checks'),
  annotate: (id: string, body: CreateAnnotationRequest) => apiFetch<VideoAnnotationDto>(`${idPath('/coach/form-checks', id)}/annotations`, { method: 'POST', body }),
  removeAnnotation: (id: string, annotationId: string) => apiFetch<void>(idPath(`${idPath('/coach/form-checks', id)}/annotations`, annotationId), { method: 'DELETE' }),
  reserveAudio: (id: string, body: CreateReviewAudioRequest) => apiFetch<UploadTicketDto>(`${idPath('/coach/form-checks', id)}/audio`, { method: 'POST', body }),
  completeAudio: (id: string, assetId: string) => apiFetch<void>(`${idPath(`${idPath('/coach/form-checks', id)}/audio`, assetId)}/complete`, { method: 'POST' }),
  submit: (id: string, summary: string) => apiFetch<void>(`${idPath('/coach/form-checks', id)}/submit`, { method: 'POST', body: { summary } }),
};

export const callsApi = {
  schedule: () => apiFetch<CoachScheduleDto>('/coach/schedule'),
  saveAvailability: (body: SaveAvailabilityRequest) => apiFetch<AvailabilityDto>('/coach/availability', { method: 'PUT', body }),
  book: (body: CreateBookingRequest) => apiFetch<BookingDto>('/coach/bookings', { method: 'POST', body }),
  update: (id: string, body: UpdateBookingRequest) => apiFetch<BookingDto>(idPath('/coach/bookings', id), { method: 'PATCH', body }),
  cancel: (id: string) => apiFetch<void>(`${idPath('/coach/bookings', id)}/cancel`, { method: 'POST' }),
  mine: () => apiFetch<ClientCallsDto>('/me/calls'),
  bookMine: (body: CreateBookingRequest) => apiFetch<BookingDto>('/me/bookings', { method: 'POST', body }),
  moveMine: (id: string, startsAt: string) => apiFetch<BookingDto>(idPath('/me/bookings', id), { method: 'PATCH', body: { startsAt } }),
  cancelMine: (id: string) => apiFetch<void>(`${idPath('/me/bookings', id)}/cancel`, { method: 'POST' }),
};

export const automationsApi = {
  overview: () => apiFetch<AutomationsDto>('/coach/automations'),
  create: (body: SaveAutomationRuleRequest) => apiFetch<AutomationRuleDto>('/coach/automations', { method: 'POST', body }),
  update: (id: string, body: SaveAutomationRuleRequest) => apiFetch<AutomationRuleDto>(idPath('/coach/automations', id), { method: 'PUT', body }),
  remove: (id: string) => apiFetch<void>(idPath('/coach/automations', id), { method: 'DELETE' }),
  dryRun: (id: string) => apiFetch<AutomationCandidateDto[]>(`${idPath('/coach/automations', id)}/dry-run`, { method: 'POST' }),
  run: () => apiFetch<RunAutomationsResultDto>('/coach/automations/run', { method: 'POST' }),
};

export const liveApi = {
  view: () => apiFetch<CoachLiveDto>('/coach/live-sessions'),
  start: (body: StartLiveSessionRequest) => apiFetch<LiveSessionDto>('/coach/live-sessions', { method: 'POST', body }),
  get: (id: string) => apiFetch<LiveSessionDto>(idPath('/coach/live-sessions', id)),
  logSet: (id: string, body: LogLiveSetRequest) => apiFetch<LiveSessionDto>(`${idPath('/coach/live-sessions', id)}/sets`, { method: 'POST', body }),
  removeSet: (id: string, setLogId: string) => apiFetch<LiveSessionDto>(idPath(`${idPath('/coach/live-sessions', id)}/sets`, setLogId), { method: 'DELETE' }),
  end: (id: string) => apiFetch<void>(`${idPath('/coach/live-sessions', id)}/end`, { method: 'POST' }),
  mine: () => apiFetch<{ session: LiveSessionDto | null }>('/me/live-session'),
};

export const nutritionApi = {
  searchFoods: (q?: string) => apiFetch<FoodDto[]>('/foods', { query: { q } }),
  createFood: (body: SaveFoodRequest) => apiFetch<FoodDto>('/foods', { method: 'POST', body }),
  archiveFood: (id: string) => apiFetch<void>(idPath('/foods', id), { method: 'DELETE' }),
  favorite: (id: string, on: boolean) => apiFetch<void>(`${idPath('/foods', id)}/favorite`, { method: on ? 'PUT' : 'DELETE' }),

  day: (date?: string) => apiFetch<NutritionDayDto>('/me/nutrition', { query: { date } }),
  saveTarget: (body: SaveNutritionTargetRequest) => apiFetch<NutritionTargetDto>('/me/nutrition/target', { method: 'PUT', body }),
  log: (body: LogMealRequest) => apiFetch<MealEntryDto[]>('/me/nutrition/entries', { method: 'POST', body }),
  removeEntry: (id: string) => apiFetch<void>(idPath('/me/nutrition/entries', id), { method: 'DELETE' }),
  logWater: (body: LogWaterRequest) => apiFetch<WaterLogDto>('/me/nutrition/water', { method: 'POST', body }),
  removeWater: (id: string) => apiFetch<void>(idPath('/me/nutrition/water', id), { method: 'DELETE' }),
  library: () => apiFetch<NutritionLibraryDto>('/me/nutrition/library'),
  createTemplate: (body: SaveMealTemplateRequest) => apiFetch<MealTemplateDto>('/me/meal-templates', { method: 'POST', body }),
  removeTemplate: (id: string) => apiFetch<void>(idPath('/me/meal-templates', id), { method: 'DELETE' }),

  forClient: (clientId: string) => apiFetch<CoachNutritionDto>(`${idPath('/clients', clientId)}/nutrition`),
  saveClientTarget: (clientId: string, body: SaveNutritionTargetRequest) =>
    apiFetch<NutritionTargetDto>(`${idPath('/clients', clientId)}/nutrition/target`, { method: 'PUT', body }),
  clearClientTarget: (clientId: string) => apiFetch<void>(`${idPath('/clients', clientId)}/nutrition/target`, { method: 'DELETE' }),
  createPlan: (clientId: string, body: SaveMealPlanRequest) => apiFetch<MealPlanDto>(`${idPath('/clients', clientId)}/meal-plans`, { method: 'POST', body }),
  replacePlan: (clientId: string, planId: string, body: SaveMealPlanRequest) =>
    apiFetch<MealPlanDto>(`${idPath('/clients', clientId)}/meal-plans/${encodeURIComponent(planId)}`, { method: 'PUT', body }),
  removePlan: (clientId: string, planId: string) =>
    apiFetch<void>(`${idPath('/clients', clientId)}/meal-plans/${encodeURIComponent(planId)}`, { method: 'DELETE' }),
};

export const analyticsApi = {
  /** 402 without MUSCLE_ANALYTICS (Pro). */
  muscles: (from: string, to: string) => apiFetch<MuscleAnalyticsDto>('/me/analytics/muscles', { query: { from, to } }),
  forClient: (clientId: string, from: string, to: string) =>
    apiFetch<MuscleAnalyticsDto>(`${idPath('/clients', clientId)}/analytics/muscles`, { query: { from, to } }),
};

export const readinessApi = {
  history: () => apiFetch<ReadinessHistoryDto>('/me/readiness'),
  save: (body: SaveReadinessRequest) => apiFetch<ReadinessDto>('/me/readiness', { method: 'PUT', body }),
  cycle: () => apiFetch<CycleContextDto>('/me/cycle'),
  saveCycle: (body: SaveCycleEntryRequest) => apiFetch<void>('/me/cycle/entries', { method: 'PUT', body }),
  removeCycle: (date: string) => apiFetch<void>(idPath('/me/cycle/entries', date), { method: 'DELETE' }),
  shareCycle: (sharedWithCoach: boolean) => apiFetch<void>('/me/cycle/sharing', { method: 'PUT', body: { sharedWithCoach } }),
};

/** MUR AI Training Coach, generator and voice: 402 without the Pro feature, 429 over the daily cap. */
export const aiApi = {
  coachOverview: () => apiFetch<CoachOverviewDto>('/ai/coach'),
  conversation: (id: string) => apiFetch<AiConversationDto>(idPath('/ai/coach/conversations', id)),
  removeConversation: (id: string) => apiFetch<void>(idPath('/ai/coach/conversations', id), { method: 'DELETE' }),
  ask: (body: AskCoachRequest) => apiFetch<AskCoachResponse>('/ai/coach', { method: 'POST', body }),
  generateWorkout: (body: GenerateWorkoutRequest) => apiFetch<GeneratedWorkoutDto>('/ai/workouts', { method: 'POST', body }),
  parseVoice: (transcript: string) => apiFetch<VoiceParseResponse>('/ai/voice/parse', { method: 'POST', body: { transcript } }),
};

export const connectorsApi = {
  list: () => apiFetch<ConnectorGrantDto[]>('/me/connectors'),
  create: (body: CreateConnectorRequest) => apiFetch<CreatedConnectorDto>('/me/connectors', { method: 'POST', body }),
  revoke: (id: string) => apiFetch<void>(idPath('/me/connectors', id), { method: 'DELETE' }),
};

/** Steps, sleep, HRV and resting HR (owner only). Sync is idempotent per day and source. */
export const healthApi = {
  overview: (days?: number) => apiFetch<HealthOverviewDto>('/me/health', { query: { days } }),
  sync: (body: SyncHealthMetricsRequest) => apiFetch<SyncHealthMetricsResponse>('/me/health/metrics', { method: 'PUT', body }),
  saveGoal: (dailySteps: number) => apiFetch<void>('/me/health/step-goal', { method: 'PUT', body: { dailySteps } }),
};

/** CSV import (preview, commit, rollback). Export downloads go through the route handler, not this client. */
export const dataApi = {
  jobs: () => apiFetch<ImportJobDto[]>('/me/data/imports'),
  preview: (body: ImportPreviewRequest) => apiFetch<ImportPreviewDto>('/me/data/imports/preview', { method: 'POST', body }),
  commit: (body: ImportCommitRequest) => apiFetch<ImportCommitResponse>('/me/data/imports/commit', { method: 'POST', body }),
  rollback: (id: string) => apiFetch<ImportJobDto>(`${idPath('/me/data/imports', id)}/rollback`, { method: 'POST' }),
};

/** Training groups, friends, blocks and reports. Every group route is members-only (404 otherwise). */
export const socialApi = {
  overview: () => apiFetch<SocialOverviewDto>('/me/social'),
  createGroup: (body: CreateGroupRequest) => apiFetch<GroupDetailDto>('/me/groups', { method: 'POST', body }),
  join: (inviteCode: string) => apiFetch<GroupDetailDto>('/me/groups/join', { method: 'POST', body: { inviteCode } }),
  group: (id: string) => apiFetch<GroupDetailDto>(idPath('/me/groups', id)),
  leave: (id: string) => apiFetch<void>(`${idPath('/me/groups', id)}/membership`, { method: 'DELETE' }),
  setShareStats: (id: string, shareStats: boolean) => apiFetch<void>(`${idPath('/me/groups', id)}/membership`, { method: 'PATCH', body: { shareStats } }),
  rotateCode: (id: string) => apiFetch<GroupDetailDto>(`${idPath('/me/groups', id)}/invite-code`, { method: 'POST' }),
  removeMember: (id: string, userId: string) => apiFetch<void>(`${idPath('/me/groups', id)}${idPath('/members', userId)}`, { method: 'DELETE' }),
  feed: (id: string) => apiFetch<SharedWorkoutDto[]>(`${idPath('/me/groups', id)}/feed`),
  share: (id: string, body: ShareWorkoutRequest) => apiFetch<SharedWorkoutDto>(`${idPath('/me/groups', id)}/shares`, { method: 'POST', body }),
  unshare: (id: string) => apiFetch<void>(idPath('/me/shares', id), { method: 'DELETE' }),
  leaderboard: (id: string) => apiFetch<GroupLeaderboardDto>(`${idPath('/me/groups', id)}/leaderboard`),
  requestFriend: (userId: string) => apiFetch<void>('/me/friends', { method: 'POST', body: { userId } }),
  acceptFriend: (id: string) => apiFetch<void>(`${idPath('/me/friends', id)}/accept`, { method: 'PUT' }),
  removeFriend: (id: string) => apiFetch<void>(idPath('/me/friends', id), { method: 'DELETE' }),
  block: (userId: string) => apiFetch<void>('/me/blocks', { method: 'POST', body: { userId } }),
  unblock: (userId: string) => apiFetch<void>(idPath('/me/blocks', userId), { method: 'DELETE' }),
  report: (body: CreateReportRequest) => apiFetch<void>('/me/reports', { method: 'POST', body }),
};
