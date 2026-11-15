package com.energycal.auth.controller

import com.energycal.account.dto.MeResponse
import com.energycal.auth.dto.AuthLoginRequest
import com.energycal.auth.dto.AuthSignupRequest
import com.energycal.auth.resolver.LoginUser
import com.energycal.auth.service.AuthService
import com.energycal.common.ClientIp
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val authCookie: AuthCookie,
) {
    @PostMapping("/signup")
    fun signup(
        @Valid @RequestBody request: AuthSignupRequest,
        servletRequest: HttpServletRequest,
    ): ResponseEntity<MeResponse> {
        val result = authService.signup(request, ClientIp.of(servletRequest))
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .header(HttpHeaders.SET_COOKIE, authCookie.issue(result.token).toString())
            .body(result.me)
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: AuthLoginRequest,
        servletRequest: HttpServletRequest,
    ): ResponseEntity<MeResponse> {
        val result = authService.login(request, ClientIp.of(servletRequest))
        return ResponseEntity
            .ok()
            .header(HttpHeaders.SET_COOKIE, authCookie.issue(result.token).toString())
            .body(result.me)
    }

    @PostMapping("/logout")
    fun logout(
        @LoginUser accountId: Long,
    ): ResponseEntity<Void> {
        authService.logout(accountId)
        return ResponseEntity
            .noContent()
            .header(HttpHeaders.SET_COOKIE, authCookie.clear().toString())
            .build()
    }
}
