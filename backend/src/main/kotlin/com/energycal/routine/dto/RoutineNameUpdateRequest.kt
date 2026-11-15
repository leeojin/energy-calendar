package com.energycal.routine.dto

import com.energycal.common.AllowedText
import jakarta.validation.constraints.NotNull

data class RoutineNameUpdateRequest(
    @field:NotNull
    @field:AllowedText(min = 1, max = 20)
    val name: String?,
)
