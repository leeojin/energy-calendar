package com.energycal.account.service

import com.energycal.account.entity.AccountBudgetHistory
import com.energycal.account.repository.AccountBudgetHistoryRepository
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@Component
class AccountBudgetWriter(
    private val accountBudgetHistoryRepository: AccountBudgetHistoryRepository,
) {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun upsert(
        accountId: Long,
        date: LocalDate,
        energyBudget: Int,
        now: LocalDateTime,
    ) {
        val existing = accountBudgetHistoryRepository.findByAccountIdAndStartDate(accountId, date)
        if (existing != null) {
            existing.energyBudget = energyBudget
            existing.updatedAt = now
            return
        }
        accountBudgetHistoryRepository.saveAndFlush(
            AccountBudgetHistory(
                accountId = accountId,
                startDate = date,
                energyBudget = energyBudget,
                createdAt = now,
                updatedAt = now,
            ),
        )
    }
}
