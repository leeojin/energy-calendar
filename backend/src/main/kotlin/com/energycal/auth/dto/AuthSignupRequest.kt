package com.energycal.auth.dto

import com.energycal.common.Password
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class AuthSignupRequest(
    @field:NotNull
    @field:Pattern(regexp = "^[a-z0-9]{4,20}$")
    val username: String?,
    @field:Password
    val password: String?,
    @field:NotBlank
    @field:Size(max = 2048)
    val turnstileToken: String?,
)
