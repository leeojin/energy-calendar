package com.energycal.account.service

import com.energycal.account.dto.AccountDeleteSummaryResponse
import com.energycal.account.repository.AccountBudgetHistoryRepository
import com.energycal.account.repository.AccountRepository
import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.service.LoginAttemptLimiter
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.condition.repository.AccountDayConditionRepository
import com.energycal.routine.repository.RoutineRepository
import com.energycal.share.entity.ShareLinkStatus
import com.energycal.share.repository.ShareLinkCommentRepository
import com.energycal.share.repository.ShareLinkRepository
import com.energycal.share.repository.ShareLinkRoutineRepository
import com.energycal.task.entity.TaskStatus
import com.energycal.task.repository.TaskMoveHistoryRepository
import com.energycal.task.repository.TaskRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AccountDeleteService(
    private val accountRepository: AccountRepository,
    private val accountBudgetHistoryRepository: AccountBudgetHistoryRepository,
    private val accountDayConditionRepository: AccountDayConditionRepository,
    private val routineRepository: RoutineRepository,
    private val taskRepository: TaskRepository,
    private val taskMoveHistoryRepository: TaskMoveHistoryRepository,
    private val shareLinkRepository: ShareLinkRepository,
    private val shareLinkRoutineRepository: ShareLinkRoutineRepository,
    private val shareLinkCommentRepository: ShareLinkCommentRepository,
    private val passwordEncoder: PasswordEncoder,
    private val loginAttemptLimiter: LoginAttemptLimiter,
) {
    @Transactional(readOnly = true)
    fun summary(login: LoginAccount): AccountDeleteSummaryResponse {
        val accountId = login.accountId
        return AccountDeleteSummaryResponse(
            taskCount = taskRepository.countByAccountIdAndStatusNot(accountId, TaskStatus.DELETED),
            shareLinkCount = shareLinkRepository.countByAccountIdAndStatusNot(accountId, ShareLinkStatus.DELETED),
            commentCount = shareLinkCommentRepository.countAllOfAccount(accountId),
        )
    }

    @Transactional
    fun delete(
        login: LoginAccount,
        username: String,
        password: String,
        ip: String,
    ) {
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
        val accountId = account.id
        shareLinkCommentRepository.deleteAllOfAccount(accountId)
        shareLinkRoutineRepository.deleteAllOfAccount(accountId)
        shareLinkRepository.deleteAllOfAccount(accountId)
        taskMoveHistoryRepository.deleteAllOfAccount(accountId)
        taskRepository.deleteAllOfAccount(accountId)
        routineRepository.deleteAllOfAccount(accountId)
        accountDayConditionRepository.deleteAllOfAccount(accountId)
        accountBudgetHistoryRepository.deleteAllOfAccount(accountId)
        accountRepository.deleteAccount(accountId)
    }
}
