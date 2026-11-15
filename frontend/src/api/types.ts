export type IsoDate = string
export type IsoDateTime = string
export type YearMonth = string
export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING'
export type ConditionLevel = 'LOW' | 'NORMAL' | 'GOOD' | 'REST'
export type TaskStatus = 'PLANNED' | 'DONE'
export type RoutineStatus = 'ACTIVE' | 'ENDED'
export type ShareLinkStatus = 'OPEN' | 'CLOSED'
export type WeekCheerLinkStatus = 'OPEN' | 'CLOSED' | 'DELETED'
export type LinkExpiry = 'THIS_WEEK' | 'FOUR_WEEKS' | 'NONE'
export type PublicTaskStatus = 'DONE' | 'PLANNED' | 'MISSED'

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'AUTH_REQUIRED'
  | 'REAUTH_REQUIRED'
  | 'CAPTCHA_FAILED'
  | 'USERNAME_UNAVAILABLE'
  | 'DATE_IN_PAST'
  | 'DATE_LOCKED'
  | 'FUTURE_TASK_NOT_COMPLETABLE'
  | 'TASK_DONE_NOT_MOVABLE'
  | 'ROUTINE_TASK_OTHER_WEEK'
  | 'ROUTINE_TASK_FIELD_NOT_EDITABLE'
  | 'MOVE_SAME_PLACE'
  | 'INVALID_DATE_RANGE'
  | 'ROUTINE_ENDED'
  | 'SHARE_LINK_NOT_OPEN'
  | 'SHARE_LINK_STILL_OPEN'
  | 'CONCURRENT_UPDATE'
  | 'TASK_NOT_FOUND'
  | 'ROUTINE_NOT_FOUND'
  | 'SHARE_LINK_NOT_FOUND'
  | 'COMMENT_NOT_FOUND'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'LOGIN_RATE_LIMITED'
  | 'SIGNUP_RATE_LIMITED'
  | 'TASK_DAY_LIMIT'
  | 'TASK_CREATE_DAILY_LIMIT'
  | 'MOVE_DAILY_LIMIT'
  | 'ROUTINE_ACTIVE_LIMIT'
  | 'ROUTINE_TOTAL_LIMIT'
  | 'SHARE_LINK_OPEN_LIMIT'
  | 'SHARE_LINK_TOTAL_LIMIT'
  | 'SHARE_LINK_CREATE_DAILY_LIMIT'
  | 'COMMENT_RATE_LIMITED'
  | 'COMMENT_DAILY_LIMIT'
  | 'INTERNAL_ERROR'
export interface ErrorResponse {
  code: ErrorCode
}
export interface HealthResponse {
  status: 'ok'
}

export interface AuthSignupRequest {
  username: string
  password: string
  turnstileToken: string
}
export interface AuthLoginRequest {
  username: string
  password: string
}
export interface AccountReauthRequest {
  username: string
  password: string
}
export interface AccountDeleteRequest {
  username: string
  password: string
}
export interface AccountDeleteSummaryResponse {
  taskCount: number
  shareLinkCount: number
  commentCount: number
}
export interface AccountNicknameUpdateRequest {
  nickname: string
}
export interface AccountPasswordUpdateRequest {
  currentPassword: string
  newPassword: string
}
export interface AccountBudgetUpdateRequest {
  energyBudget: number
}
export interface MeResponse {
  username: string
  nickname: string
  createdDate: IsoDate
  energyBudget: number
  isRecentLogin: boolean
}

export interface DayConditionUpdateRequest {
  conditionLevel: ConditionLevel
}
export interface DayConditionResponse {
  date: IsoDate
  conditionLevel: ConditionLevel
}

export interface TaskCreateRequest {
  name: string
  plannedDate: IsoDate
  timeSlot: TimeSlot
  energyCost: number
  isVisible?: boolean
}
export interface TaskUpdateRequest {
  name?: string
  energyCost?: number
  isVisible?: boolean
}
export interface TaskMoveRequest {
  toDate: IsoDate
  toTimeSlot: TimeSlot
}
export interface TaskResponse {
  taskId: number
  routineId: number | null
  name: string
  plannedDate: IsoDate
  occurrenceDate: IsoDate | null
  timeSlot: TimeSlot
  energyCost: number
  status: TaskStatus
  isVisible: boolean
  completedAt: IsoDateTime | null
  moveCount: number
  isLate: boolean
  isLocked: boolean
}
export interface TaskMoveHistoryResponse {
  taskMoveHistoryId: number
  taskId: number
  taskName: string
  fromDate: IsoDate
  fromTimeSlot: TimeSlot
  toDate: IsoDate
  toTimeSlot: TimeSlot
  createdAt: IsoDateTime
}

export interface WeekTitleResponse {
  year: number
  month: number
  weekOfMonth: number
}
export interface DayResponse {
  date: IsoDate
  energyBudget: number
  conditionLevel: ConditionLevel
  dayBudget: number
  usedEnergy: number
  doneEnergy: number
  remainingEnergy: number
  overflowEnergy: number
  tasks: TaskResponse[]
}
export interface WeekCheerResponse {
  shareLinkCommentId: number
  shareLinkId: number
  linkName: string
  linkStatus: WeekCheerLinkStatus
  nickname: string
  body: string
  createdAt: IsoDateTime
}
export interface WeekResponse {
  weekStart: IsoDate
  weekEnd: IsoDate
  today: IsoDate
  lockDate: IsoDate
  title: WeekTitleResponse
  isThisWeek: boolean
  isBeyondRange: boolean
  currentEnergyBudget: number
  days: DayResponse[]
  leftoverTasks: TaskResponse[]
  cheers: WeekCheerResponse[]
}
export interface MonthResponse {
  month: YearMonth
  today: IsoDate
  lockDate: IsoDate
  firstMonth: YearMonth
  days: DayResponse[]
}
export interface OccurrenceCreateResponse {
  createdCount: number
  isBeyondRange: boolean
}

export interface RoutineCreateRequest {
  name: string
  energyCost: number
  timeSlot: TimeSlot
  weekdays: number
  startDate: IsoDate
  endDate?: IsoDate | null
}
export interface RoutineNameUpdateRequest {
  name: string
}
export interface RoutineCostUpdateRequest {
  energyCost: number
}
export interface RoutineResponse {
  routineId: number
  name: string
  energyCost: number
  timeSlot: TimeSlot
  weekdays: number
  startDate: IsoDate
  endDate: IsoDate | null
  status: RoutineStatus
}
export interface RoutineEndResponse {
  routine: RoutineResponse
  deletedTaskCount: number
}
export interface RoutineCostUpdateResponse {
  routine: RoutineResponse
  updatedTaskCount: number
}

export interface ShareLinkCreateRequest {
  name: string
  routineIds: number[]
  isOneTimeVisible: boolean
  expiry: LinkExpiry
}
export interface ShareLinkUpdateRequest {
  isOneTimeVisible?: boolean
  expiry?: LinkExpiry
}
export interface ShareLinkResponse {
  shareLinkId: number
  name: string
  token: string
  status: ShareLinkStatus
  isExpired: boolean
  expireDate: IsoDate | null
  isOneTimeVisible: boolean
  routineIds: number[]
  commentCount: number
  createdAt: IsoDateTime
  closedAt: IsoDateTime | null
}
export interface ShareLinkCommentResponse {
  shareLinkCommentId: number
  nickname: string
  body: string
  createdAt: IsoDateTime
  weekStart: IsoDate
}

export interface ShareLinkCommentCreateRequest {
  nickname: string
  body: string
}
export interface PublicTaskResponse {
  name: string
  status: PublicTaskStatus
}
export interface PublicDayResponse {
  date: IsoDate
  tasks: PublicTaskResponse[]
}
export interface PublicCommentResponse {
  nickname: string
  body: string
  createdAt: IsoDateTime
}
export interface PublicShareResponse {
  name: string
  weekStart: IsoDate
  weekEnd: IsoDate
  today: IsoDate
  expireDate: IsoDate | null
  days: PublicDayResponse[]
  comments: PublicCommentResponse[]
}
