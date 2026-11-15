package com.energycal.task.dto

import com.energycal.task.entity.TaskMoveHistory
import com.energycal.task.entity.TimeSlot
import java.time.LocalDate
import java.time.LocalDateTime

data class TaskMoveHistoryResponse(
    val taskMoveHistoryId: Long,
    val taskId: Long,
    val taskName: String,
    val fromDate: LocalDate,
    val fromTimeSlot: TimeSlot,
    val toDate: LocalDate,
    val toTimeSlot: TimeSlot,
    val createdAt: LocalDateTime,
)

fun TaskMoveHistory.toResponse(): TaskMoveHistoryResponse =
    TaskMoveHistoryResponse(
        taskMoveHistoryId = id,
        taskId = task.id,
        taskName = task.routine?.name ?: task.name.orEmpty(),
        fromDate = fromDate,
        fromTimeSlot = fromTimeSlot,
        toDate = toDate,
        toTimeSlot = toTimeSlot,
        createdAt = createdAt,
    )
