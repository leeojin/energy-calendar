package com.energycal.auth.service

import com.energycal.auth.config.JwtProperties
import com.energycal.calc.EnergyCalc
import io.jsonwebtoken.Claims
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import java.util.Base64
import java.util.Date
import javax.crypto.SecretKey

@Component
class JwtProvider(
    props: JwtProperties,
    private val clock: Clock,
) {
    private val key: SecretKey = buildKey(props.secret)
    private val ttl: Duration = Duration.ofHours(props.ttlHours)

    private val parser =
        Jwts
            .parser()
            .verifyWith(key)
            .clock { Date.from(clock.instant()) }
            .build()

    fun issue(
        accountId: Long,
        tokenVersion: Int,
        issuedAt: LocalDateTime,
    ): String {
        val iat = issuedAt.truncatedTo(ChronoUnit.SECONDS).atZone(EnergyCalc.ZONE).toInstant()
        return Jwts
            .builder()
            .subject(accountId.toString())
            .claim(CLAIM_VERSION, tokenVersion)
            .issuedAt(Date.from(iat))
            .expiration(Date.from(iat.plus(ttl)))
            .signWith(key, Jwts.SIG.HS256)
            .compact()
    }

    fun parse(token: String): Claims? =
        try {
            parser.parseSignedClaims(token).payload
        } catch (e: JwtException) {
            null
        } catch (e: IllegalArgumentException) {
            null
        }

    companion object {
        const val CLAIM_VERSION = "ver"
        private const val MIN_KEY_BYTES = 32

        private fun buildKey(secret: String): SecretKey {
            val bytes =
                try {
                    Base64.getDecoder().decode(secret.trim())
                } catch (e: IllegalArgumentException) {
                    null
                }
            check(bytes != null && bytes.size >= MIN_KEY_BYTES) {
                "JWT_SECRET은 base64로 32바이트(256비트) 이상이어야 합니다"
            }
            return Keys.hmacShaKeyFor(bytes)
        }
    }
}
