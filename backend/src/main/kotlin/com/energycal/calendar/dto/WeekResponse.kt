package com.energycal.calendar.dto

import com.energycal.task.dto.TaskResponse
import com.fasterxml.jackson.annotation.JsonProperty
import java.time.LocalDate

data class WeekResponse(
    val weekStart: LocalDate,
    val weekEnd: LocalDate,
    val today: LocalDate,
    val lockDate: LocalDate,
    val title: WeekTitleResponse,
    @get:JsonProperty("isThisWeek")
    val isThisWeek: Boolean,
    @get:JsonProperty("isBeyondRange")
    val isBeyondRange: Boolean,
    val currentEnergyBudget: Int,
    val days: List<DayResponse>,
    val leftoverTasks: List<TaskResponse>,
    val cheers: List<WeekCheerResponse>,
)
