package com.energycal.share.dto

import java.time.LocalDate

data class PublicShareResponse(
    val name: String,
    val weekStart: LocalDate,
    val weekEnd: LocalDate,
    val today: LocalDate,
    val expireDate: LocalDate?,
    val days: List<PublicDayResponse>,
    val comments: List<PublicCommentResponse>,
)
