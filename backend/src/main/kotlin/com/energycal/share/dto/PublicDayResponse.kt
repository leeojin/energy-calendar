package com.energycal.share.dto

import java.time.LocalDate

data class PublicDayResponse(
    val date: LocalDate,
    val tasks: List<PublicTaskResponse>,
)
