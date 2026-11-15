package com.energycal.account.repository

import com.energycal.account.entity.AccountBudgetHistory
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface AccountBudgetHistoryRepository : JpaRepository<AccountBudgetHistory, Long> {
    fun findAllByAccountId(accountId: Long): List<AccountBudgetHistory>

    fun findByAccountIdAndStartDate(
        accountId: Long,
        startDate: LocalDate,
    ): AccountBudgetHistory?

    @Modifying(flushAutomatically = true)
    @Query("delete from AccountBudgetHistory h where h.accountId = :accountId")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int
}
