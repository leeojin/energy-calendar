package com.energycal.task.dto

import com.energycal.calc.EnergyCalc
import com.energycal.task.entity.Task
import com.energycal.task.entity.TaskStatus
import com.energycal.task.entity.TimeSlot
import com.fasterxml.jackson.annotation.JsonProperty
import java.time.LocalDate
import java.time.LocalDateTime

data class TaskResponse(
    val taskId: Long,
    val routineId: Long?,
    val name: String,
    val plannedDate: LocalDate,
    val occurrenceDate: LocalDate?,
    val timeSlot: TimeSlot,
    val energyCost: Int,
    val status: TaskStatus,
    @get:JsonProperty("isVisible")
    val isVisible: Boolean,
    val completedAt: LocalDateTime?,
    val moveCount: Long,
    @get:JsonProperty("isLate")
    val isLate: Boolean,
    @get:JsonProperty("isLocked")
    val isLocked: Boolean,
)

fun Task.toResponse(
    today: LocalDate,
    lockDate: LocalDate,
    moveCount: Long,
): TaskResponse =
    TaskResponse(
        taskId = id,
        routineId = routine?.id,
        name = routine?.name ?: name.orEmpty(),
        plannedDate = plannedDate,
        occurrenceDate = occurrenceDate,
        timeSlot = timeSlot,
        energyCost = energyCost,
        status = status,
        isVisible = isVisible,
        completedAt = completedAt,
        moveCount = moveCount,
        isLate = EnergyCalc.isLate(status, plannedDate, today),
        isLocked = plannedDate.isBefore(lockDate),
    )
