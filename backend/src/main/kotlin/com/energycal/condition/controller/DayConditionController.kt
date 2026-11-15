package com.energycal.condition.controller

import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.resolver.LoginUser
import com.energycal.condition.dto.DayConditionResponse
import com.energycal.condition.dto.DayConditionUpdateRequest
import com.energycal.condition.service.DayConditionService
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/day-conditions")
class DayConditionController(
    private val dayConditionService: DayConditionService,
) {
    @PutMapping("/{date}")
    fun updateCondition(
        @LoginUser login: LoginAccount,
        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate,
        @Valid @RequestBody request: DayConditionUpdateRequest,
    ): DayConditionResponse = dayConditionService.updateCondition(login.accountId, date, request.conditionLevel!!)
}
