package com.energycal.share.service

import org.springframework.stereotype.Component
import java.security.SecureRandom
import java.util.Base64

@Component
class ShareTokenGenerator {
    private val random = SecureRandom()
    private val encoder = Base64.getUrlEncoder().withoutPadding()

    fun newToken(): String {
        val bytes = ByteArray(TOKEN_BYTES)
        random.nextBytes(bytes)
        return encoder.encodeToString(bytes)
    }

    companion object {
        private const val TOKEN_BYTES = 16
    }
}
