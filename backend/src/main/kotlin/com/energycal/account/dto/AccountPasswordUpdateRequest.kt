package com.energycal.account.dto

import com.energycal.common.Password
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size

data class AccountPasswordUpdateRequest(
    @field:NotEmpty
    @field:Size(max = 72)
    val currentPassword: String?,
    @field:Password
    val newPassword: String?,
)
