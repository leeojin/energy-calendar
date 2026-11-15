package com.energycal.calendar.controller

import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.resolver.LoginUser
import com.energycal.calendar.dto.MonthResponse
import com.energycal.calendar.dto.WeekResponse
import com.energycal.calendar.service.CalendarService
import com.energycal.routine.dto.OccurrenceCreateResponse
import com.energycal.routine.service.OccurrenceService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
class CalendarController(
    private val calendarService: CalendarService,
    private val occurrenceService: OccurrenceService,
) {
    @GetMapping("/api/weeks/{monday}")
    fun getWeek(
        @LoginUser login: LoginAccount,
        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) monday: LocalDate,
    ): WeekResponse = calendarService.getWeek(login.accountId, monday)

    @GetMapping("/api/months/{month}")
    fun getMonth(
        @LoginUser login: LoginAccount,
        @PathVariable month: String,
    ): MonthResponse = calendarService.getMonth(login.accountId, month)

    @PostMapping("/api/weeks/{monday}/occurrences")
    fun createWeekOccurrences(
        @LoginUser login: LoginAccount,
        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) monday: LocalDate,
    ): OccurrenceCreateResponse = occurrenceService.createForWeek(login.accountId, monday)

    @PostMapping("/api/months/{month}/occurrences")
    fun createMonthOccurrences(
        @LoginUser login: LoginAccount,
        @PathVariable month: String,
    ): OccurrenceCreateResponse = occurrenceService.createForMonth(login.accountId, month)
}
