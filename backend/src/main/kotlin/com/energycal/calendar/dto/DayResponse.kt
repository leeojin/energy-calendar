package com.energycal.calendar.dto

import com.energycal.condition.entity.ConditionLevel
import com.energycal.task.dto.TaskResponse
import java.time.LocalDate

data class DayResponse(
    val date: LocalDate,
    val energyBudget: Int,
    val conditionLevel: ConditionLevel,
    val dayBudget: Int,
    val usedEnergy: Int,
    val doneEnergy: Int,
    val remainingEnergy: Int,
    val overflowEnergy: Int,
    val tasks: List<TaskResponse>,
)
