package com.energycal.auth.service

import com.github.benmanes.caffeine.cache.Cache
import com.github.benmanes.caffeine.cache.Caffeine
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.time.Duration
import java.util.concurrent.atomic.AtomicInteger

@Component
class LoginAttemptLimiter(
    @param:Value("\${app.limits.login-failure-max}") private val maxFailures: Int,
    @Value("\${app.limits.login-lock-minutes}") lockMinutes: Long,
) {
    private val failures: Cache<String, AtomicInteger> =
        Caffeine
            .newBuilder()
            .expireAfterWrite(Duration.ofMinutes(lockMinutes))
            .maximumSize(MAX_KEYS)
            .build()

    fun isBlocked(key: String): Boolean = (failures.getIfPresent(key)?.get() ?: 0) >= maxFailures

    fun recordFailure(key: String) {
        failures.asMap().compute(key) { _, old -> AtomicInteger((old?.get() ?: 0) + 1) }
    }

    fun reset(key: String) {
        failures.invalidate(key)
    }

    companion object {
        private const val MAX_KEYS = 100_000L

        fun keyOf(
            username: String,
            ip: String,
        ): String = "login:$username:$ip"
    }
}
