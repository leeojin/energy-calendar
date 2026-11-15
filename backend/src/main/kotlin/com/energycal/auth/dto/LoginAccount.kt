package com.energycal.auth.dto

import java.time.LocalDateTime

data class LoginAccount(
    val accountId: Long,
    val issuedAt: LocalDateTime,
)
