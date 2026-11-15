package com.energycal.routine.dto

data class OccurrenceCreateResponse(
    val createdCount: Int,
    val isBeyondRange: Boolean,
)
