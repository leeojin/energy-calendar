package com.energycal.routine.dto

data class RoutineEndResponse(
    val routine: RoutineResponse,
    val deletedTaskCount: Int,
)
