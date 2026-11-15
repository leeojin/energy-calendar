package com.energycal.task.dto

import com.energycal.common.AllowedText
import com.energycal.task.entity.TimeSlot
import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class TaskCreateRequest(
    @field:NotNull
    @field:AllowedText(min = 1, max = 20)
    val name: String?,
    @field:NotNull
    val plannedDate: LocalDate?,
    @field:NotNull
    val timeSlot: TimeSlot?,
    @field:NotNull
    @field:Min(1)
    @field:Max(10)
    val energyCost: Int?,
    @param:JsonProperty("isVisible")
    @get:JsonProperty("isVisible")
    val isVisible: Boolean? = false,
)
