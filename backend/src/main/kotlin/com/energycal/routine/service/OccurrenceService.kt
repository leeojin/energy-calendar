package com.energycal.routine.service

import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.routine.dto.OccurrenceCreateResponse
import com.energycal.routine.entity.Routine
import com.energycal.routine.entity.RoutineStatus
import com.energycal.routine.repository.RoutineRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeParseException

@Service
class OccurrenceService(
    private val routineRepository: RoutineRepository,
    private val occurrenceWriter: OccurrenceWriter,
    private val clock: Clock,
) {
    @Transactional
    fun createForWeek(
        accountId: Long,
        monday: LocalDate,
    ): OccurrenceCreateResponse {
        if (!EnergyCalc.isMonday(monday)) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED)
        }
        val today = EnergyCalc.today(clock)
        val routines = routineRepository.findAllByAccountIdAndStatusOrderByIdAsc(accountId, RoutineStatus.ACTIVE)
        return OccurrenceCreateResponse(
            createdCount = createWeek(accountId, routines, monday, today),
            isBeyondRange = EnergyCalc.isBeyondOccurrenceRange(monday, today),
        )
    }

    @Transactional
    fun createForMonth(
        accountId: Long,
        month: String,
    ): OccurrenceCreateResponse {
        val yearMonth = parseMonth(month)
        val today = EnergyCalc.today(clock)
        val routines = routineRepository.findAllByAccountIdAndStatusOrderByIdAsc(accountId, RoutineStatus.ACTIVE)
        val weekStarts = EnergyCalc.weekStartsOverlapping(yearMonth)
        val created = weekStarts.sumOf { createWeek(accountId, routines, it, today) }
        return OccurrenceCreateResponse(
            createdCount = created,
            isBeyondRange = weekStarts.all { EnergyCalc.isBeyondOccurrenceRange(it, today) },
        )
    }

    private fun createWeek(
        accountId: Long,
        routines: List<Routine>,
        weekStart: LocalDate,
        today: LocalDate,
    ): Int {
        var created = 0
        for (routine in routines) {
            val dates = EnergyCalc.occurrenceDates(routine.weekdays, routine.startDate, routine.endDate, weekStart, today)
            for (date in dates) {
                val inserted =
                    try {
                        occurrenceWriter.insertIfAbsent(accountId, routine.id, date, routine.timeSlot, routine.energyCost)
                    } catch (e: DataIntegrityViolationException) {
                        false
                    }
                if (inserted) created++
            }
        }
        return created
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

    companion object {
        private val MONTH_PATTERN = Regex("^\\d{4}-\\d{2}$")
    }
}
