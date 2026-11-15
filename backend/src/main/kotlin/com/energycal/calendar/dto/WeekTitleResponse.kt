package com.energycal.calendar.dto

import com.energycal.calc.EnergyCalc

data class WeekTitleResponse(
    val year: Int,
    val month: Int,
    val weekOfMonth: Int,
)

fun EnergyCalc.WeekTitle.toResponse(): WeekTitleResponse = WeekTitleResponse(year, month, weekOfMonth)
