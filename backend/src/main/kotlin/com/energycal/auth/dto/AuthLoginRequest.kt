package com.energycal.auth.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size

data class AuthLoginRequest(
    @field:NotBlank
    @field:Size(max = 20)
    val username: String?,
    // 로그인에는 가입용 비밀번호 검증을 적용하지 않음
    @field:NotEmpty
    @field:Size(max = 72)
    val password: String?,
)
