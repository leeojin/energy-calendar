package com.energycal.common

import com.energycal.calc.EnergyCalc
import com.github.benmanes.caffeine.cache.Cache
import com.github.benmanes.caffeine.cache.Caffeine
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.util.concurrent.atomic.AtomicInteger

@Component
class RateLimiter(
    private val clock: Clock,
) {
    enum class Window {
        PER_MINUTE,
        PER_DAY_KST,
    }

    private val minuteCounters: Cache<String, AtomicInteger> = newCache(Duration.ofMinutes(2))
    private val dayCounters: Cache<String, AtomicInteger> = newCache(Duration.ofHours(25))

    fun tryAcquire(
        name: String,
        subject: String,
        limit: Int,
        window: Window,
    ): Boolean {
        val (cache, windowKey) =
            when (window) {
                Window.PER_MINUTE -> minuteCounters to (clock.instant().epochSecond / 60).toString()
                Window.PER_DAY_KST -> dayCounters to EnergyCalc.today(clock).toString()
            }
        val counter = cache.get("$name:$subject:$windowKey") { AtomicInteger(0) }
        return counter.incrementAndGet() <= limit
    }

    private fun newCache(ttl: Duration): Cache<String, AtomicInteger> =
        Caffeine
            .newBuilder()
            .expireAfterWrite(ttl)
            .maximumSize(MAX_KEYS)
            .build()

    companion object {
        private const val MAX_KEYS = 200_000L
    }
}
