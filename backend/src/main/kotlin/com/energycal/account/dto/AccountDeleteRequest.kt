package com.energycal.account.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size

data class AccountDeleteRequest(
    @field:NotBlank
    @field:Size(max = 20)
    val username: String?,
    @field:NotEmpty
    @field:Size(max = 72)
    val password: String?,
)
