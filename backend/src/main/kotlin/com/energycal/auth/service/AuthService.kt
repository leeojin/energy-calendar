package com.energycal.auth.service

import com.energycal.account.dto.MeResponse
import com.energycal.account.repository.AccountRepository
import com.energycal.account.service.MeService
import com.energycal.auth.dto.AuthLoginRequest
import com.energycal.auth.dto.AuthSignupRequest
import com.energycal.auth.dto.LoginAccount
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.common.RateLimiter
import org.springframework.beans.factory.annotation.Value
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

@Service
class AuthService(
    private val accountRepository: AccountRepository,
    private val meService: MeService,
    private val jwtProvider: JwtProvider,
    private val passwordEncoder: PasswordEncoder,
    private val turnstileVerifier: TurnstileVerifier,
    private val rateLimiter: RateLimiter,
    private val loginAttemptLimiter: LoginAttemptLimiter,
    private val clock: Clock,
    @param:Value("\${app.limits.signup-per-ip-per-day}") private val signupPerIpPerDay: Int,
) {
    data class AuthResult(
        val me: MeResponse,
        val token: String,
    )

    // 중복 가입은 트랜잭션 밖에서 처리
    fun signup(
        request: AuthSignupRequest,
        ip: String,
    ): AuthResult {
        val username = request.username!!
        if (!rateLimiter.tryAcquire("signup", ip, signupPerIpPerDay, RateLimiter.Window.PER_DAY_KST)) {
            throw BusinessException(ErrorCode.SIGNUP_RATE_LIMITED)
        }
        if (!turnstileVerifier.verify(request.turnstileToken!!, ip)) {
            throw BusinessException(ErrorCode.CAPTCHA_FAILED)
        }
        if (accountRepository.existsByUsername(username)) {
            throw BusinessException(ErrorCode.USERNAME_UNAVAILABLE)
        }
        val now = nowSeconds()
        val account =
            try {
                meService.createAccount(username, passwordEncoder.encode(request.password!!)!!, now)
            } catch (e: DataIntegrityViolationException) {
                throw BusinessException(ErrorCode.USERNAME_UNAVAILABLE)
            }
        return issue(account.id, account.tokenVersion, now)
    }

    @Transactional
    fun login(
        request: AuthLoginRequest,
        ip: String,
    ): AuthResult {
        val username = request.username!!
        val key = LoginAttemptLimiter.keyOf(username, ip)
        if (loginAttemptLimiter.isBlocked(key)) {
            throw BusinessException(ErrorCode.LOGIN_RATE_LIMITED)
        }
        val account = accountRepository.findByUsername(username)
        if (account == null || !passwordEncoder.matches(request.password!!, account.passwordHash)) {
            loginAttemptLimiter.recordFailure(key)
            throw BusinessException(ErrorCode.INVALID_CREDENTIALS)
        }
        loginAttemptLimiter.reset(key)
        val now = nowSeconds()
        account.lastLoginAt = now
        account.updatedAt = now
        return issue(account.id, account.tokenVersion, now)
    }

    @Transactional
    fun logout(accountId: Long) {
        val account =
            accountRepository.findById(accountId).orElse(null)
                ?: throw BusinessException(ErrorCode.AUTH_REQUIRED)
        account.tokenVersion += 1
        account.updatedAt = nowSeconds()
    }

    private fun issue(
        accountId: Long,
        tokenVersion: Int,
        issuedAt: LocalDateTime,
    ): AuthResult {
        val me = meService.getMe(LoginAccount(accountId, issuedAt))
        return AuthResult(me, jwtProvider.issue(accountId, tokenVersion, issuedAt))
    }

    private fun nowSeconds(): LocalDateTime = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS)
}
