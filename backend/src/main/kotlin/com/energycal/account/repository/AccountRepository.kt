package com.energycal.account.repository

import com.energycal.account.entity.Account
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface AccountRepository : JpaRepository<Account, Long> {
    fun existsByUsername(username: String): Boolean

    fun findByUsername(username: String): Account?

    @Modifying(flushAutomatically = true)
    @Query("delete from Account a where a.id = :accountId")
    fun deleteAccount(
        @Param("accountId") accountId: Long,
    ): Int
}
