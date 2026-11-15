package com.energycal.condition.dto

import com.energycal.condition.entity.ConditionLevel
import jakarta.validation.constraints.NotNull

data class DayConditionUpdateRequest(
    @field:NotNull
    val conditionLevel: ConditionLevel?,
)
