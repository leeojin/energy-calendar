package com.energycal.routine.controller

import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.resolver.LoginUser
import com.energycal.routine.dto.RoutineCostUpdateRequest
import com.energycal.routine.dto.RoutineCostUpdateResponse
import com.energycal.routine.dto.RoutineCreateRequest
import com.energycal.routine.dto.RoutineEndResponse
import com.energycal.routine.dto.RoutineNameUpdateRequest
import com.energycal.routine.dto.RoutineResponse
import com.energycal.routine.service.RoutineService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/routines")
class RoutineController(
    private val routineService: RoutineService,
) {
    @GetMapping
    fun getRoutines(
        @LoginUser login: LoginAccount,
    ): List<RoutineResponse> = routineService.getRoutines(login.accountId)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createRoutine(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: RoutineCreateRequest,
    ): RoutineResponse = routineService.createRoutine(login.accountId, request)

    @PatchMapping("/{routineId}/name")
    fun updateRoutineName(
        @LoginUser login: LoginAccount,
        @PathVariable routineId: Long,
        @Valid @RequestBody request: RoutineNameUpdateRequest,
    ): RoutineResponse = routineService.updateRoutineName(login.accountId, routineId, request)

    @PatchMapping("/{routineId}/energy-cost")
    fun updateRoutineCost(
        @LoginUser login: LoginAccount,
        @PathVariable routineId: Long,
        @Valid @RequestBody request: RoutineCostUpdateRequest,
    ): RoutineCostUpdateResponse = routineService.updateRoutineCost(login.accountId, routineId, request)

    @PostMapping("/{routineId}/end")
    fun endRoutine(
        @LoginUser login: LoginAccount,
        @PathVariable routineId: Long,
    ): RoutineEndResponse = routineService.endRoutine(login.accountId, routineId)
}
