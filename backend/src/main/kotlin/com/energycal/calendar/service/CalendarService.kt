package com.energycal.calendar.service

import com.energycal.account.repository.AccountBudgetHistoryRepository
import com.energycal.calc.EnergyCalc
import com.energycal.calendar.dto.DayResponse
import com.energycal.calendar.dto.MonthResponse
import com.energycal.calendar.dto.WeekCheerResponse
import com.energycal.calendar.dto.WeekResponse
import com.energycal.calendar.dto.toResponse
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.condition.entity.ConditionLevel
import com.energycal.condition.repository.AccountDayConditionRepository
import com.energycal.share.repository.ShareLinkCommentRepository
import com.energycal.task.dto.toResponse
import com.energycal.task.entity.Task
import com.energycal.task.entity.TaskStatus
import com.energycal.task.repository.TaskRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeParseException

@Service
class CalendarService(
    private val taskRepository: TaskRepository,
    private val budgetHistoryRepository: AccountBudgetHistoryRepository,
    private val dayConditionRepository: AccountDayConditionRepository,
    private val shareLinkCommentRepository: ShareLinkCommentRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getWeek(
        accountId: Long,
        monday: LocalDate,
    ): WeekResponse {
        if (!EnergyCalc.isMonday(monday)) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED)
        }
        val today = EnergyCalc.today(clock)
        val lockDate = EnergyCalc.lockDate(today)
        val thisMonday = EnergyCalc.weekStart(today)
        val dates = EnergyCalc.weekDates(monday)
        val weekEnd = dates.last()
        val isThisWeek = monday == thisMonday

        val budgetHistory = readBudgetHistory(accountId)
        val leftovers =
            if (isThisWeek) {
                taskRepository.findOneTimeInRangeByStatus(accountId, lockDate, thisMonday, TaskStatus.PLANNED)
            } else {
                emptyList()
            }
        val days = buildDays(accountId, dates, budgetHistory, today, lockDate)
        val moveCounts = countMoves(leftovers)

        val (cheerFrom, cheerTo) = EnergyCalc.weekRange(monday)
        val cheers =
            shareLinkCommentRepository.findAllOfAccountInRange(accountId, cheerFrom, cheerTo).map {
                WeekCheerResponse(
                    shareLinkCommentId = it.id,
                    shareLinkId = it.shareLink.id,
                    linkName = it.shareLink.name,
                    linkStatus = it.shareLink.status,
                    nickname = it.nickname,
                    body = it.body,
                    createdAt = it.createdAt,
                )
            }

        return WeekResponse(
            weekStart = monday,
            weekEnd = weekEnd,
            today = today,
            lockDate = lockDate,
            title = EnergyCalc.weekTitle(monday).toResponse(),
            isThisWeek = isThisWeek,
            isBeyondRange = EnergyCalc.isBeyondOccurrenceRange(monday, today),
            currentEnergyBudget = EnergyCalc.currentBudget(budgetHistory),
            days = days,
            leftoverTasks = sortTasks(leftovers).map { it.toResponse(today, lockDate, moveCounts[it.id] ?: 0L) },
            cheers = cheers,
        )
    }

    @Transactional(readOnly = true)
    fun getMonth(
        accountId: Long,
        month: String,
    ): MonthResponse {
        val yearMonth = parseMonth(month)
        val today = EnergyCalc.today(clock)
        val lockDate = EnergyCalc.lockDate(today)
        val budgetHistory = readBudgetHistory(accountId)
        val days = buildDays(accountId, EnergyCalc.monthDates(yearMonth), budgetHistory, today, lockDate)
        return MonthResponse(
            month = yearMonth,
            today = today,
            lockDate = lockDate,
            firstMonth = YearMonth.from(budgetHistory.minOf { it.startDate }),
            days = days,
        )
    }

    private fun readBudgetHistory(accountId: Long): List<EnergyCalc.BudgetEntry> =
        budgetHistoryRepository.findAllByAccountId(accountId).map { EnergyCalc.BudgetEntry(it.startDate, it.energyBudget) }

    private fun buildDays(
        accountId: Long,
        dates: List<LocalDate>,
        budgetHistory: List<EnergyCalc.BudgetEntry>,
        today: LocalDate,
        lockDate: LocalDate,
    ): List<DayResponse> {
        val from = dates.first()
        val to = dates.last()
        val conditions =
            dayConditionRepository
                .findAllByAccountIdAndConditionDateBetween(accountId, from, to)
                .associate { it.conditionDate to it.conditionLevel }
        val rangeTasks = taskRepository.findInRangeWithRoutine(accountId, from, to, TaskStatus.DELETED)
        val moveCounts = countMoves(rangeTasks)
        val tasksByDate = rangeTasks.groupBy { it.plannedDate }
        return dates.map { date ->
            val tasks = sortTasks(tasksByDate[date].orEmpty())
            val energyBudget = EnergyCalc.budgetOn(date, budgetHistory)
            val level = conditions[date] ?: ConditionLevel.NORMAL
            val dayBudget = EnergyCalc.dayBudget(energyBudget, level)
            val costs = tasks.map { EnergyCalc.CostItem(it.energyCost, it.status) }
            val used = EnergyCalc.usedEnergy(costs)
            DayResponse(
                date = date,
                energyBudget = energyBudget,
                conditionLevel = level,
                dayBudget = dayBudget,
                usedEnergy = used,
                doneEnergy = EnergyCalc.doneEnergy(costs),
                remainingEnergy = EnergyCalc.remainingEnergy(dayBudget, used),
                overflowEnergy = EnergyCalc.overflowEnergy(dayBudget, used),
                tasks = tasks.map { it.toResponse(today, lockDate, moveCounts[it.id] ?: 0L) },
            )
        }
    }

    private fun parseMonth(month: String): YearMonth {
        if (!MONTH_PATTERN.matches(month)) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED)
        }
        return try {
            YearMonth.parse(month)
        } catch (e: DateTimeParseException) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED)
        }
    }

    private fun countMoves(tasks: List<Task>): Map<Long, Long> {
        if (tasks.isEmpty()) return emptyMap()
        return taskRepository
            .countMovesByTaskIds(tasks.map { it.id }.toSet())
            .associate { (it[0] as Number).toLong() to (it[1] as Number).toLong() }
    }

    private fun sortTasks(tasks: List<Task>): List<Task> =
        tasks.sortedWith(compareBy<Task>({ it.plannedDate }, { it.timeSlot.ordinal }, { it.id }))

    companion object {
        private val MONTH_PATTERN = Regex("^\\d{4}-\\d{2}$")
    }
}
