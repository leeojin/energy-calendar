import type {
  AccountBudgetUpdateRequest,
  AccountNicknameUpdateRequest,
  AccountPasswordUpdateRequest,
  AccountDeleteRequest,
  AccountDeleteSummaryResponse,
  AccountReauthRequest,
  AuthLoginRequest,
  AuthSignupRequest,
  DayConditionResponse,
  DayConditionUpdateRequest,
  IsoDate,
  MeResponse,
  MonthResponse,
  OccurrenceCreateResponse,
  PublicCommentResponse,
  PublicShareResponse,
  RoutineCostUpdateRequest,
  RoutineCostUpdateResponse,
  RoutineCreateRequest,
  RoutineEndResponse,
  RoutineNameUpdateRequest,
  RoutineResponse,
  ShareLinkCommentCreateRequest,
  ShareLinkCommentResponse,
  ShareLinkCreateRequest,
  ShareLinkResponse,
  ShareLinkUpdateRequest,
  TaskCreateRequest,
  TaskMoveHistoryResponse,
  TaskMoveRequest,
  TaskResponse,
  TaskUpdateRequest,
  WeekResponse,
  YearMonth,
  ErrorCode,
  HealthResponse,
} from './types.ts'

export interface ApiPort {
  getHealth(): Promise<HealthResponse>
  signup(req: AuthSignupRequest): Promise<MeResponse>
  login(req: AuthLoginRequest): Promise<MeResponse>
  logout(): Promise<void>
  getMe(): Promise<MeResponse>
  updateNickname(req: AccountNicknameUpdateRequest): Promise<MeResponse>
  updatePassword(req: AccountPasswordUpdateRequest): Promise<void>
  updateEnergyBudget(req: AccountBudgetUpdateRequest): Promise<MeResponse>
  reauth(req: AccountReauthRequest): Promise<MeResponse>
  getDeleteSummary(): Promise<AccountDeleteSummaryResponse>
  deleteAccount(req: AccountDeleteRequest): Promise<void>
  putDayCondition(date: IsoDate, req: DayConditionUpdateRequest): Promise<DayConditionResponse>
  createWeekOccurrences(monday: IsoDate): Promise<OccurrenceCreateResponse>
  getWeek(monday: IsoDate): Promise<WeekResponse>
  createMonthOccurrences(month: YearMonth): Promise<OccurrenceCreateResponse>
  getMonth(month: YearMonth): Promise<MonthResponse>
  createTask(req: TaskCreateRequest): Promise<TaskResponse>
  updateTask(taskId: number, req: TaskUpdateRequest): Promise<TaskResponse>
  deleteTask(taskId: number): Promise<void>
  completeTask(taskId: number): Promise<TaskResponse>
  uncompleteTask(taskId: number): Promise<TaskResponse>
  moveTask(taskId: number, req: TaskMoveRequest): Promise<TaskResponse>
  getTaskMoves(taskId: number): Promise<TaskMoveHistoryResponse[]>
  getMovesOfWeek(monday: IsoDate): Promise<TaskMoveHistoryResponse[]>
  getRoutines(): Promise<RoutineResponse[]>
  createRoutine(req: RoutineCreateRequest): Promise<RoutineResponse>
  updateRoutineName(routineId: number, req: RoutineNameUpdateRequest): Promise<RoutineResponse>
  updateRoutineEnergyCost(
    routineId: number,
    req: RoutineCostUpdateRequest,
  ): Promise<RoutineCostUpdateResponse>
  endRoutine(routineId: number): Promise<RoutineEndResponse>
  getShareLinks(): Promise<ShareLinkResponse[]>
  createShareLink(req: ShareLinkCreateRequest): Promise<ShareLinkResponse>
  updateShareLink(shareLinkId: number, req: ShareLinkUpdateRequest): Promise<ShareLinkResponse>
  closeShareLink(shareLinkId: number): Promise<ShareLinkResponse>
  deleteShareLink(shareLinkId: number): Promise<void>
  deleteShareLinkWithComments(shareLinkId: number): Promise<void>
  addShareLinkRoutine(shareLinkId: number, routineId: number): Promise<void>
  removeShareLinkRoutine(shareLinkId: number, routineId: number): Promise<void>
  getShareLinkComments(shareLinkId: number): Promise<ShareLinkCommentResponse[]>
  deleteShareLinkComment(commentId: number): Promise<void>
  getPublicShare(token: string): Promise<PublicShareResponse>
  createPublicComment(
    token: string,
    req: ShareLinkCommentCreateRequest,
  ): Promise<PublicCommentResponse>
}

export class ApiError extends Error {
  status: number
  code: ErrorCode | 'NETWORK_ERROR' | 'DEMO_ONLY'
  constructor(status: number, code: ErrorCode | 'NETWORK_ERROR' | 'DEMO_ONLY') {
    super(code)
    this.status = status
    this.code = code
  }
}
