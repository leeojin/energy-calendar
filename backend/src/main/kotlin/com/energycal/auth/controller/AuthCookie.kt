package com.energycal.auth.controller

import com.energycal.auth.config.JwtProperties
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component
import java.time.Duration

@Component
class AuthCookie(
    @param:Value("\${app.cookie.secure}") private val secure: Boolean,
    props: JwtProperties,
) {
    private val maxAge: Duration = Duration.ofHours(props.ttlHours)

    fun issue(token: String): ResponseCookie = build(token, maxAge)

    fun clear(): ResponseCookie = build("", Duration.ZERO)

    private fun build(
        value: String,
        age: Duration,
    ): ResponseCookie =
        ResponseCookie
            .from(NAME, value)
            .httpOnly(true)
            .secure(secure)
            .sameSite("Lax")
            .path("/")
            .maxAge(age)
            .build()

    companion object {
        const val NAME = "ec_at"
    }
}
