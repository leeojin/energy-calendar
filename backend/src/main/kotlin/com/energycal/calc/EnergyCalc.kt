package com.energycal.calc

import com.energycal.common.ErrorCode
import com.energycal.condition.entity.ConditionLevel
import com.energycal.share.dto.LinkExpiry
import com.energycal.share.dto.PublicTaskStatus
import com.energycal.share.entity.ShareLinkStatus
import com.energycal.task.entity.TaskStatus
import com.energycal.task.entity.TimeSlot
import java.time.Clock
import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters

object EnergyCalc {
    val ZONE: ZoneId = ZoneId.of("Asia/Seoul")

    private const val OCCURRENCE_WEEKS_AHEAD = 8L

    private const val MOVE_HISTORY_KEEP_DAYS = 28L

    private const val ALL_WEEKDAYS_MASK = 127

    private val REAUTH_WINDOW: Duration = Duration.ofMinutes(5)

    fun today(clock: Clock): LocalDate = LocalDate.now(clock.withZone(ZONE))

    fun weekStart(date: LocalDate): LocalDate = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    fun isMonday(date: LocalDate): Boolean = date.dayOfWeek == DayOfWeek.MONDAY

    fun weekDates(weekStart: LocalDate): List<LocalDate> = (0L until 7L).map { weekStart.plusDays(it) }

    fun lockDate(today: LocalDate): LocalDate = weekStart(today).minusWeeks(1)

    fun isLocked(
        date: LocalDate,
        today: LocalDate,
    ): Boolean = date.isBefore(lockDate(today))

    fun weekTitle(weekStart: LocalDate): WeekTitle {
        val thursday = weekStart(weekStart).plusDays(3)
        return WeekTitle(thursday.year, thursday.monthValue, (thursday.dayOfMonth - 1) / 7 + 1)
    }

    data class WeekTitle(
        val year: Int,
        val month: Int,
        val weekOfMonth: Int,
    )

    fun monthDates(month: YearMonth): List<LocalDate> = (1..month.lengthOfMonth()).map { month.atDay(it) }

    fun weekStartsOverlapping(month: YearMonth): List<LocalDate> {
        val last = month.atEndOfMonth()
        return generateSequence(weekStart(month.atDay(1))) { it.plusWeeks(1) }
            .takeWhile { !it.isAfter(last) }
            .toList()
    }

    fun weekRange(weekStart: LocalDate): Pair<LocalDateTime, LocalDateTime> =
        weekStart.atStartOfDay() to weekStart.plusWeeks(1).atStartOfDay()

    fun isBeyondOccurrenceRange(
        weekStart: LocalDate,
        today: LocalDate,
    ): Boolean = weekStart.isAfter(weekStart(today).plusWeeks(OCCURRENCE_WEEKS_AHEAD))

    data class BudgetEntry(
        val startDate: LocalDate,
        val energyBudget: Int,
    )

    fun budgetOn(
        date: LocalDate,
        history: List<BudgetEntry>,
    ): Int {
        val sorted = history.sortedBy { it.startDate }
        return (sorted.lastOrNull { !it.startDate.isAfter(date) } ?: sorted.first()).energyBudget
    }

    fun currentBudget(history: List<BudgetEntry>): Int = history.maxBy { it.startDate }.energyBudget

    fun dayBudget(
        budget: Int,
        level: ConditionLevel,
    ): Int =
        when (level) {
            ConditionLevel.LOW -> budget / 2
            ConditionLevel.NORMAL -> budget
            ConditionLevel.GOOD -> budget * 6 / 5
            ConditionLevel.REST -> 0
        }

    data class CostItem(
        val energyCost: Int,
        val status: TaskStatus,
    )

    fun usedEnergy(items: List<CostItem>): Int =
        items.filter { it.status == TaskStatus.PLANNED || it.status == TaskStatus.DONE }.sumOf { it.energyCost }

    fun doneEnergy(items: List<CostItem>): Int = items.filter { it.status == TaskStatus.DONE }.sumOf { it.energyCost }

    fun remainingEnergy(
        dayBudget: Int,
        used: Int,
    ): Int = dayBudget - used

    fun overflowEnergy(
        dayBudget: Int,
        used: Int,
    ): Int = maxOf(0, used - dayBudget)

    fun canCreateOn(
        date: LocalDate,
        today: LocalDate,
    ): Boolean = !date.isBefore(today)

    fun isLate(
        status: TaskStatus,
        plannedDate: LocalDate,
        today: LocalDate,
    ): Boolean = status == TaskStatus.PLANNED && plannedDate.isBefore(today)

    fun canComplete(
        plannedDate: LocalDate,
        today: LocalDate,
    ): ErrorCode? =
        when {
            isLocked(plannedDate, today) -> ErrorCode.DATE_LOCKED
            plannedDate.isAfter(today) -> ErrorCode.FUTURE_TASK_NOT_COMPLETABLE
            else -> null
        }

    data class MoveSubject(
        val status: TaskStatus,
        val plannedDate: LocalDate,
        val timeSlot: TimeSlot,
        val isRoutineTask: Boolean,
        val occurrenceDate: LocalDate?,
    )

    // 검사 순서가 오류 응답 우선순위
    fun checkMove(
        s: MoveSubject,
        toDate: LocalDate,
        toSlot: TimeSlot,
        today: LocalDate,
    ): ErrorCode? {
        if (s.status == TaskStatus.DONE) return ErrorCode.TASK_DONE_NOT_MOVABLE
        if (isLocked(s.plannedDate, today)) return ErrorCode.DATE_LOCKED
        if (isLocked(toDate, today)) return ErrorCode.DATE_LOCKED
        if (s.isRoutineTask && weekStart(toDate) != weekStart(s.occurrenceDate ?: s.plannedDate)) {
            return ErrorCode.ROUTINE_TASK_OTHER_WEEK
        }
        if (s.plannedDate == toDate && s.timeSlot == toSlot) return ErrorCode.MOVE_SAME_PLACE
        return null
    }

    fun moveHistoryCutoff(today: LocalDate): LocalDateTime = today.minusDays(MOVE_HISTORY_KEEP_DAYS).atStartOfDay()

    fun isValidWeekdays(mask: Int): Boolean = mask in 1..ALL_WEEKDAYS_MASK

    fun maskToWeekdays(mask: Int): Set<DayOfWeek> = DayOfWeek.entries.filter { mask and bitOf(it) != 0 }.toSet()

    fun weekdaysToMask(days: Set<DayOfWeek>): Int = days.fold(0) { acc, day -> acc or bitOf(day) }

    private fun bitOf(day: DayOfWeek): Int = 1 shl (day.value - 1)

    fun occurrenceDates(
        mask: Int,
        startDate: LocalDate,
        endDate: LocalDate?,
        weekStart: LocalDate,
        today: LocalDate,
    ): List<LocalDate> {
        if (isBeyondOccurrenceRange(weekStart, today)) return emptyList()
        val days = maskToWeekdays(mask)
        return weekDates(weekStart).filter { date ->
            date.dayOfWeek in days &&
                !date.isBefore(startDate) &&
                (endDate == null || !date.isAfter(endDate)) &&
                !date.isBefore(today)
        }
    }

    fun routineEndDate(
        currentEnd: LocalDate?,
        today: LocalDate,
    ): LocalDate = if (currentEnd != null && currentEnd.isBefore(today)) currentEnd else today

    fun expireDateFor(
        expiry: LinkExpiry,
        today: LocalDate,
    ): LocalDate? =
        when (expiry) {
            LinkExpiry.THIS_WEEK -> weekStart(today).plusDays(6)
            LinkExpiry.FOUR_WEEKS -> weekStart(today).plusDays(27)
            LinkExpiry.NONE -> null
        }

    fun isLinkOpen(
        status: ShareLinkStatus,
        expireDate: LocalDate?,
        today: LocalDate,
    ): Boolean = status == ShareLinkStatus.OPEN && (expireDate == null || !expireDate.isBefore(today))

    data class VisibilityTask(
        val routineId: Long?,
        val status: TaskStatus,
        val plannedDate: LocalDate,
        val isVisible: Boolean,
    )

    data class VisibilityLink(
        val status: ShareLinkStatus,
        val expireDate: LocalDate?,
        val isOneTimeVisible: Boolean,
        val routineIds: Set<Long>,
    )

    fun isVisibleOnLink(
        t: VisibilityTask,
        l: VisibilityLink,
        today: LocalDate,
    ): Boolean {
        if (!isLinkOpen(l.status, l.expireDate, today)) return false
        if (weekStart(t.plannedDate) != weekStart(today)) return false
        if (t.status == TaskStatus.DELETED) return false
        return if (t.routineId != null) {
            t.routineId in l.routineIds
        } else {
            l.isOneTimeVisible && t.isVisible
        }
    }

    fun publicStatus(
        status: TaskStatus,
        plannedDate: LocalDate,
        today: LocalDate,
    ): PublicTaskStatus =
        when {
            status == TaskStatus.DONE -> PublicTaskStatus.DONE
            plannedDate.isBefore(today) -> PublicTaskStatus.MISSED
            else -> PublicTaskStatus.PLANNED
        }

    fun isRecentLogin(
        tokenIssuedAt: LocalDateTime,
        lastLoginAt: LocalDateTime?,
        now: LocalDateTime,
    ): Boolean {
        if (lastLoginAt == null) return false
        if (tokenIssuedAt.truncatedTo(ChronoUnit.SECONDS) != lastLoginAt.truncatedTo(ChronoUnit.SECONDS)) return false
        return Duration.between(lastLoginAt, now) <= REAUTH_WINDOW
    }
}
