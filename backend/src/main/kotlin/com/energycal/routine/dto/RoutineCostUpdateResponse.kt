package com.energycal.routine.dto

data class RoutineCostUpdateResponse(
    val routine: RoutineResponse,
    val updatedTaskCount: Int,
)
