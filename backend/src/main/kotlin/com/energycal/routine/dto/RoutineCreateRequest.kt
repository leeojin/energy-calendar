package com.energycal.routine.dto

import com.energycal.common.AllowedText
import com.energycal.task.entity.TimeSlot
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class RoutineCreateRequest(
    @field:NotNull
    @field:AllowedText(min = 1, max = 20)
    val name: String?,
    @field:NotNull
    @field:Min(1)
    @field:Max(10)
    val energyCost: Int?,
    @field:NotNull
    val timeSlot: TimeSlot?,
    @field:NotNull
    @field:Min(1)
    @field:Max(127)
    val weekdays: Int?,
    @field:NotNull
    val startDate: LocalDate?,
    val endDate: LocalDate? = null,
)
