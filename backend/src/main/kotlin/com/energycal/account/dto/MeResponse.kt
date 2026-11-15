package com.energycal.account.dto

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.LocalDate

data class MeResponse(
    val username: String,
    val nickname: String,
    val createdDate: LocalDate,
    val energyBudget: Int,
    @get:JsonProperty("isRecentLogin")
    val isRecentLogin: Boolean,
)
