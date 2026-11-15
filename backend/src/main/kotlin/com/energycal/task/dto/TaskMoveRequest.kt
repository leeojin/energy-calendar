package com.energycal.task.dto

import com.energycal.task.entity.TimeSlot
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class TaskMoveRequest(
    @field:NotNull
    val toDate: LocalDate?,
    @field:NotNull
    val toTimeSlot: TimeSlot?,
)
