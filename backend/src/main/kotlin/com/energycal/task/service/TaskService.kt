package com.energycal.task.service

import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.common.RateLimiter
import com.energycal.task.dto.TaskCreateRequest
import com.energycal.task.dto.TaskMoveHistoryResponse
import com.energycal.task.dto.TaskMoveRequest
import com.energycal.task.dto.TaskResponse
import com.energycal.task.dto.TaskUpdateRequest
import com.energycal.task.dto.toResponse
import com.energycal.task.entity.Task
import com.energycal.task.entity.TaskMoveHistory
import com.energycal.task.entity.TaskStatus
import com.energycal.task.repository.TaskMoveHistoryRepository
import com.energycal.task.repository.TaskRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime

@Service
class TaskService(
    private val taskRepository: TaskRepository,
    private val taskMoveHistoryRepository: TaskMoveHistoryRepository,
    private val rateLimiter: RateLimiter,
    private val clock: Clock,
    @param:Value("\${app.limits.task-per-date}") private val taskPerDate: Int,
    @param:Value("\${app.limits.task-create-per-day}") private val taskCreatePerDay: Int,
    @param:Value("\${app.limits.move-per-day}") private val movePerDay: Int,
) {
    @Transactional
    fun createTask(
        accountId: Long,
        request: TaskCreateRequest,
    ): TaskResponse {
        val today = EnergyCalc.today(clock)
        val plannedDate = request.plannedDate!!
        if (!EnergyCalc.canCreateOn(plannedDate, today)) {
            throw BusinessException(ErrorCode.DATE_IN_PAST)
        }
        if (taskRepository.countByAccountIdAndPlannedDateAndStatusNot(accountId, plannedDate, TaskStatus.DELETED) >= taskPerDate) {
            throw BusinessException(ErrorCode.TASK_DAY_LIMIT)
        }
        if (!rateLimiter.tryAcquire("task-create", accountId.toString(), taskCreatePerDay, RateLimiter.Window.PER_DAY_KST)) {
            throw BusinessException(ErrorCode.TASK_CREATE_DAILY_LIMIT)
        }
        val now = LocalDateTime.now(clock)
        val task =
            Task(
                accountId = accountId,
                routine = null,
                occurrenceDate = null,
                name = request.name!!.trim(),
                plannedDate = plannedDate,
                timeSlot = request.timeSlot!!,
                energyCost = request.energyCost!!,
                createdAt = now,
                updatedAt = now,
            )
        task.isVisible = request.isVisible ?: false
        val saved = taskRepository.save(task)
        return saved.toResponse(today, EnergyCalc.lockDate(today), 0)
    }

    @Transactional
    fun updateTask(
        accountId: Long,
        taskId: Long,
        request: TaskUpdateRequest,
    ): TaskResponse {
        if (request.isEmpty()) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED)
        }
        val today = EnergyCalc.today(clock)
        val task = findMine(accountId, taskId)
        if (EnergyCalc.isLocked(task.plannedDate, today)) {
            throw BusinessException(ErrorCode.DATE_LOCKED)
        }
        if (task.routine != null && (request.name != null || request.isVisible != null)) {
            throw BusinessException(ErrorCode.ROUTINE_TASK_FIELD_NOT_EDITABLE)
        }
        request.name?.let { task.name = it.trim() }
        request.energyCost?.let { task.energyCost = it }
        request.isVisible?.let { task.isVisible = it }
        task.updatedAt = LocalDateTime.now(clock)
        taskRepository.saveAndFlush(task)
        return task.toResponse(today, EnergyCalc.lockDate(today), taskRepository.countMovesByTaskId(task.id))
    }

    @Transactional
    fun deleteTask(
        accountId: Long,
        taskId: Long,
    ) {
        val today = EnergyCalc.today(clock)
        val task = findMine(accountId, taskId)
        if (EnergyCalc.isLocked(task.plannedDate, today)) {
            throw BusinessException(ErrorCode.DATE_LOCKED)
        }
        task.status = TaskStatus.DELETED
        task.updatedAt = LocalDateTime.now(clock)
        taskRepository.saveAndFlush(task)
    }

    @Transactional
    fun completeTask(
        accountId: Long,
        taskId: Long,
    ): TaskResponse {
        val today = EnergyCalc.today(clock)
        val task = findMine(accountId, taskId)
        EnergyCalc.canComplete(task.plannedDate, today)?.let { throw BusinessException(it) }
        if (task.status != TaskStatus.DONE) {
            val now = LocalDateTime.now(clock)
            task.status = TaskStatus.DONE
            task.completedAt = now
            task.updatedAt = now
            taskRepository.saveAndFlush(task)
        }
        return task.toResponse(today, EnergyCalc.lockDate(today), taskMoveHistoryRepository.countByTaskId(task.id))
    }

    @Transactional
    fun uncompleteTask(
        accountId: Long,
        taskId: Long,
    ): TaskResponse {
        val today = EnergyCalc.today(clock)
        val task = findMine(accountId, taskId)
        if (EnergyCalc.isLocked(task.plannedDate, today)) {
            throw BusinessException(ErrorCode.DATE_LOCKED)
        }
        if (task.status != TaskStatus.PLANNED) {
            task.status = TaskStatus.PLANNED
            task.completedAt = null
            task.updatedAt = LocalDateTime.now(clock)
            taskRepository.saveAndFlush(task)
        }
        return task.toResponse(today, EnergyCalc.lockDate(today), taskMoveHistoryRepository.countByTaskId(task.id))
    }

    @Transactional
    fun moveTask(
        accountId: Long,
        taskId: Long,
        request: TaskMoveRequest,
    ): TaskResponse {
        val today = EnergyCalc.today(clock)
        val task = findMine(accountId, taskId)
        val toDate = request.toDate!!
        val toSlot = request.toTimeSlot!!
        val subject =
            EnergyCalc.MoveSubject(
                status = task.status,
                plannedDate = task.plannedDate,
                timeSlot = task.timeSlot,
                isRoutineTask = task.routine != null,
                occurrenceDate = task.occurrenceDate,
            )
        EnergyCalc.checkMove(subject, toDate, toSlot, today)?.let { throw BusinessException(it) }
        if (toDate != task.plannedDate &&
            taskRepository.countByAccountIdAndPlannedDateAndStatusNot(accountId, toDate, TaskStatus.DELETED) >= taskPerDate
        ) {
            throw BusinessException(ErrorCode.TASK_DAY_LIMIT)
        }
        if (!rateLimiter.tryAcquire("move", accountId.toString(), movePerDay, RateLimiter.Window.PER_DAY_KST)) {
            throw BusinessException(ErrorCode.MOVE_DAILY_LIMIT)
        }
        val now = LocalDateTime.now(clock)
        val history =
            TaskMoveHistory(
                task = task,
                fromDate = task.plannedDate,
                fromTimeSlot = task.timeSlot,
                toDate = toDate,
                toTimeSlot = toSlot,
                createdAt = now,
            )
        task.plannedDate = toDate
        task.timeSlot = toSlot
        task.updatedAt = now
        taskRepository.saveAndFlush(task)
        taskMoveHistoryRepository.save(history)
        return task.toResponse(today, EnergyCalc.lockDate(today), taskMoveHistoryRepository.countByTaskId(task.id))
    }

    @Transactional(readOnly = true)
    fun getTaskMoves(
        accountId: Long,
        taskId: Long,
    ): List<TaskMoveHistoryResponse> {
        val task = findMine(accountId, taskId)
        return taskMoveHistoryRepository.findAllByTaskIdOldestFirst(task.id).map { it.toResponse() }
    }

    @Transactional(readOnly = true)
    fun getMovesOfWeek(
        accountId: Long,
        week: LocalDate,
    ): List<TaskMoveHistoryResponse> {
        if (!EnergyCalc.isMonday(week)) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED)
        }
        return taskMoveHistoryRepository
            .findAllOfAccountInRangeNewestFirst(accountId, week.atStartOfDay(), week.plusWeeks(1).atStartOfDay())
            .map { it.toResponse() }
    }

    private fun findMine(
        accountId: Long,
        taskId: Long,
    ): Task =
        taskRepository.findByIdAndAccountIdAndStatusNot(taskId, accountId, TaskStatus.DELETED)
            ?: throw BusinessException(ErrorCode.TASK_NOT_FOUND)
}
