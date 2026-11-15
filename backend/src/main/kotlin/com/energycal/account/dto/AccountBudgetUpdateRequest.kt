package com.energycal.account.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull

data class AccountBudgetUpdateRequest(
    @field:NotNull
    @field:Min(1)
    @field:Max(30)
    val energyBudget: Int?,
)
