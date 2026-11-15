package com.energycal.routine.dto

import com.energycal.routine.entity.Routine
import com.energycal.routine.entity.RoutineStatus
import com.energycal.task.entity.TimeSlot
import java.time.LocalDate

data class RoutineResponse(
    val routineId: Long,
    val name: String,
    val energyCost: Int,
    val timeSlot: TimeSlot,
    val weekdays: Int,
    val startDate: LocalDate,
    val endDate: LocalDate?,
    val status: RoutineStatus,
)

fun Routine.toResponse(): RoutineResponse =
    RoutineResponse(
        routineId = id,
        name = name,
        energyCost = energyCost,
        timeSlot = timeSlot,
        weekdays = weekdays,
        startDate = startDate,
        endDate = endDate,
        status = status,
    )
