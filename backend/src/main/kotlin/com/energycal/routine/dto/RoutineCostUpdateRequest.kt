package com.energycal.routine.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull

data class RoutineCostUpdateRequest(
    @field:NotNull
    @field:Min(1)
    @field:Max(10)
    val energyCost: Int?,
)
