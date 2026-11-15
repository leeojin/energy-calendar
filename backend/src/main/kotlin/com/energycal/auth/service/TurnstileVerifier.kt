package com.energycal.auth.service

interface TurnstileVerifier {
    fun verify(
        token: String,
        remoteIp: String,
    ): Boolean
}
