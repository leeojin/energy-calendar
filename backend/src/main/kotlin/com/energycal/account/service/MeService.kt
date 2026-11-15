package com.energycal.account.service

import com.energycal.account.dto.MeResponse
import com.energycal.account.entity.Account
import com.energycal.account.entity.AccountBudgetHistory
import com.energycal.account.repository.AccountBudgetHistoryRepository
import com.energycal.account.repository.AccountRepository
import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.service.JwtProvider
import com.energycal.auth.service.LoginAttemptLimiter
import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

@Service
class MeService(
    private val accountRepository: AccountRepository,
    private val accountBudgetHistoryRepository: AccountBudgetHistoryRepository,
    private val accountBudgetWriter: AccountBudgetWriter,
    private val passwordEncoder: PasswordEncoder,
    private val loginAttemptLimiter: LoginAttemptLimiter,
    private val jwtProvider: JwtProvider,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getMe(login: LoginAccount): MeResponse {
        val account =
            accountRepository.findById(login.accountId).orElse(null)
                ?: throw BusinessException(ErrorCode.AUTH_REQUIRED)
        return meOf(account, login)
    }

    // 유니크 충돌은 저장 트랜잭션 밖에서 처리
    fun updateEnergyBudget(
        login: LoginAccount,
        energyBudget: Int,
    ): MeResponse {
        val now = LocalDateTime.now(clock)
        val today = EnergyCalc.today(clock)
        try {
            accountBudgetWriter.upsert(login.accountId, today, energyBudget, now)
        } catch (e: DataIntegrityViolationException) {
            accountBudgetWriter.upsert(login.accountId, today, energyBudget, now)
        }
        return getMe(login)
    }

    @Transactional
    fun updateNickname(
        login: LoginAccount,
        nickname: String,
    ): MeResponse {
        val account =
            accountRepository.findById(login.accountId).orElse(null)
                ?: throw BusinessException(ErrorCode.AUTH_REQUIRED)
        account.nickname = nickname.trim()
        account.updatedAt = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS)
        return meOf(account, login)
    }

    @Transactional
    fun updatePassword(
        login: LoginAccount,
        currentPassword: String,
        newPassword: String,
        ip: String,
    ): String {
        val account =
            accountRepository.findById(login.accountId).orElse(null)
                ?: throw BusinessException(ErrorCode.AUTH_REQUIRED)
        if (!EnergyCalc.isRecentLogin(login.issuedAt, account.lastLoginAt, LocalDateTime.now(clock))) {
            throw BusinessException(ErrorCode.REAUTH_REQUIRED)
        }
        val key = LoginAttemptLimiter.keyOf(account.username, ip)
        if (loginAttemptLimiter.isBlocked(key)) {
            throw BusinessException(ErrorCode.LOGIN_RATE_LIMITED)
        }
        if (!passwordEncoder.matches(currentPassword, account.passwordHash)) {
            loginAttemptLimiter.recordFailure(key)
            throw BusinessException(ErrorCode.INVALID_CREDENTIALS)
        }
        loginAttemptLimiter.reset(key)
        val now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS)
        account.passwordHash = passwordEncoder.encode(newPassword)!!
        account.tokenVersion += 1
        account.updatedAt = now
        // 비밀번호 변경 시 lastLoginAt은 유지
        return jwtProvider.issue(account.id, account.tokenVersion, now)
    }

    data class ReauthResult(
        val me: MeResponse,
        val token: String,
    )

    @Transactional
    fun reauth(
        login: LoginAccount,
        username: String,
        password: String,
        ip: String,
    ): ReauthResult {
        val account =
            accountRepository.findById(login.accountId).orElse(null)
                ?: throw BusinessException(ErrorCode.AUTH_REQUIRED)
        val key = LoginAttemptLimiter.keyOf(account.username, ip)
        if (loginAttemptLimiter.isBlocked(key)) {
            throw BusinessException(ErrorCode.LOGIN_RATE_LIMITED)
        }
        if (username != account.username || !passwordEncoder.matches(password, account.passwordHash)) {
            loginAttemptLimiter.recordFailure(key)
            throw BusinessException(ErrorCode.INVALID_CREDENTIALS)
        }
        loginAttemptLimiter.reset(key)
        val now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS)
        account.lastLoginAt = now
        account.updatedAt = now
        val token = jwtProvider.issue(account.id, account.tokenVersion, now)
        return ReauthResult(meOf(account, LoginAccount(account.id, now)), token)
    }

    @Transactional
    fun createAccount(
        username: String,
        passwordHash: String,
        now: LocalDateTime,
    ): Account {
        val account =
            Account(
                username = username,
                nickname = username,
                passwordHash = passwordHash,
                createdAt = now,
                updatedAt = now,
            ).apply { lastLoginAt = now }
        accountRepository.saveAndFlush(account)
        accountBudgetHistoryRepository.save(
            AccountBudgetHistory(
                accountId = account.id,
                startDate = now.toLocalDate(),
                energyBudget = INITIAL_BUDGET,
                createdAt = now,
                updatedAt = now,
            ),
        )
        return account
    }

    @Transactional(readOnly = true)
    fun meOf(
        account: Account,
        login: LoginAccount,
    ): MeResponse {
        val history =
            accountBudgetHistoryRepository
                .findAllByAccountId(account.id)
                .map { EnergyCalc.BudgetEntry(it.startDate, it.energyBudget) }
        return MeResponse(
            username = account.username,
            nickname = account.nickname,
            createdDate = account.createdAt.toLocalDate(),
            energyBudget = EnergyCalc.currentBudget(history),
            isRecentLogin = EnergyCalc.isRecentLogin(login.issuedAt, account.lastLoginAt, LocalDateTime.now(clock)),
        )
    }

    companion object {
        const val INITIAL_BUDGET = 12
    }
}
