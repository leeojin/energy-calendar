package com.energycal.account.dto

import com.energycal.common.AllowedText
import jakarta.validation.constraints.NotNull

data class AccountNicknameUpdateRequest(
    @field:NotNull
    @field:AllowedText(min = 1, max = 20)
    val nickname: String?,
)
