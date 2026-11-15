package com.energycal.routine.service

import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.routine.dto.RoutineCostUpdateRequest
import com.energycal.routine.dto.RoutineCostUpdateResponse
import com.energycal.routine.dto.RoutineCreateRequest
import com.energycal.routine.dto.RoutineEndResponse
import com.energycal.routine.dto.RoutineNameUpdateRequest
import com.energycal.routine.dto.RoutineResponse
import com.energycal.routine.dto.toResponse
import com.energycal.routine.entity.Routine
import com.energycal.routine.entity.RoutineStatus
import com.energycal.routine.repository.RoutineRepository
import com.energycal.task.entity.TaskStatus
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

@Service
class RoutineService(
    private val routineRepository: RoutineRepository,
    private val clock: Clock,
    @param:Value("\${app.limits.routine-active-max}") private val routineActiveMax: Int,
    @param:Value("\${app.limits.routine-total-max}") private val routineTotalMax: Int,
) {
    @Transactional(readOnly = true)
    fun getRoutines(accountId: Long): List<RoutineResponse> =
        routineRepository
            .findAllByAccountIdOrderByIdAsc(accountId)
            .sortedBy { if (it.status == RoutineStatus.ACTIVE) 0 else 1 }
            .map { it.toResponse() }

    @Transactional
    fun createRoutine(
        accountId: Long,
        request: RoutineCreateRequest,
    ): RoutineResponse {
        val today = EnergyCalc.today(clock)
        val startDate = request.startDate!!
        val endDate = request.endDate
        if (startDate.isBefore(today)) {
            throw BusinessException(ErrorCode.DATE_IN_PAST)
        }
        if (endDate != null && endDate.isBefore(startDate)) {
            throw BusinessException(ErrorCode.INVALID_DATE_RANGE)
        }
        if (routineRepository.countByAccountIdAndStatus(accountId, RoutineStatus.ACTIVE) >= routineActiveMax) {
            throw BusinessException(ErrorCode.ROUTINE_ACTIVE_LIMIT)
        }
        if (routineRepository.countByAccountId(accountId) >= routineTotalMax) {
            throw BusinessException(ErrorCode.ROUTINE_TOTAL_LIMIT)
        }
        val now = LocalDateTime.now(clock)
        val routine =
            Routine(
                accountId = accountId,
                name = request.name!!.trim(),
                energyCost = request.energyCost!!,
                timeSlot = request.timeSlot!!,
                weekdays = request.weekdays!!,
                startDate = startDate,
                createdAt = now,
                updatedAt = now,
            )
        routine.endDate = endDate
        return routineRepository.save(routine).toResponse()
    }

    @Transactional
    fun updateRoutineName(
        accountId: Long,
        routineId: Long,
        request: RoutineNameUpdateRequest,
    ): RoutineResponse {
        val routine = findActiveMine(accountId, routineId)
        routine.name = request.name!!.trim()
        routine.updatedAt = LocalDateTime.now(clock)
        return routine.toResponse()
    }

    @Transactional
    fun updateRoutineCost(
        accountId: Long,
        routineId: Long,
        request: RoutineCostUpdateRequest,
    ): RoutineCostUpdateResponse {
        val today = EnergyCalc.today(clock)
        val routine = findActiveMine(accountId, routineId)
        val now = LocalDateTime.now(clock)
        val energyCost = request.energyCost!!
        routine.energyCost = energyCost
        routine.updatedAt = now
        val updated =
            routineRepository.updateFuturePlannedTaskCost(
                routineId = routine.id,
                energyCost = energyCost,
                today = today,
                now = now,
                planned = TaskStatus.PLANNED,
            )
        return RoutineCostUpdateResponse(routine = routine.toResponse(), updatedTaskCount = updated)
    }

    @Transactional
    fun endRoutine(
        accountId: Long,
        routineId: Long,
    ): RoutineEndResponse {
        val today = EnergyCalc.today(clock)
        val routine = findActiveMine(accountId, routineId)
        val now = LocalDateTime.now(clock)
        routine.status = RoutineStatus.ENDED
        routine.endDate = EnergyCalc.routineEndDate(routine.endDate, today)
        routine.updatedAt = now
        val deleted =
            routineRepository.deleteFuturePlannedTasks(
                routineId = routine.id,
                today = today,
                now = now,
                planned = TaskStatus.PLANNED,
                deleted = TaskStatus.DELETED,
            )
        return RoutineEndResponse(routine = routine.toResponse(), deletedTaskCount = deleted)
    }

    private fun findActiveMine(
        accountId: Long,
        routineId: Long,
    ): Routine {
        val routine =
            routineRepository.findByIdAndAccountId(routineId, accountId)
                ?: throw BusinessException(ErrorCode.ROUTINE_NOT_FOUND)
        if (routine.status != RoutineStatus.ACTIVE) {
            throw BusinessException(ErrorCode.ROUTINE_ENDED)
        }
        return routine
    }
}
