package com.energycal.calendar.dto

import java.time.LocalDate
import java.time.YearMonth

data class MonthResponse(
    val month: YearMonth,
    val today: LocalDate,
    val lockDate: LocalDate,
    val firstMonth: YearMonth,
    val days: List<DayResponse>,
)
