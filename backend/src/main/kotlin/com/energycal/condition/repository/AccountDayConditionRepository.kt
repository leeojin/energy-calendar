package com.energycal.condition.repository

import com.energycal.condition.entity.AccountDayCondition
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface AccountDayConditionRepository : JpaRepository<AccountDayCondition, Long> {
    fun findByAccountIdAndConditionDate(
        accountId: Long,
        conditionDate: LocalDate,
    ): AccountDayCondition?

    fun findAllByAccountIdAndConditionDateBetween(
        accountId: Long,
        from: LocalDate,
        to: LocalDate,
    ): List<AccountDayCondition>

    @Modifying(flushAutomatically = true)
    @Query("delete from AccountDayCondition c where c.accountId = :accountId")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int
}
