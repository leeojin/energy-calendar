package com.energycal.condition.dto

import com.energycal.condition.entity.AccountDayCondition
import com.energycal.condition.entity.ConditionLevel
import java.time.LocalDate

data class DayConditionResponse(
    val date: LocalDate,
    val conditionLevel: ConditionLevel,
)

fun AccountDayCondition.toResponse(): DayConditionResponse = DayConditionResponse(conditionDate, conditionLevel)
