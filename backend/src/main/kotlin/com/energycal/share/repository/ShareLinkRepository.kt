package com.energycal.share.repository

import com.energycal.share.entity.ShareLink
import com.energycal.share.entity.ShareLinkStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface ShareLinkRepository : JpaRepository<ShareLink, Long> {
    fun findByIdAndAccountIdAndStatusNot(
        id: Long,
        accountId: Long,
        status: ShareLinkStatus,
    ): ShareLink?

    fun findByToken(token: String): ShareLink?

    fun findAllByAccountIdAndStatusNotOrderByIdAsc(
        accountId: Long,
        status: ShareLinkStatus,
    ): List<ShareLink>

    fun countByAccountIdAndStatusNot(
        accountId: Long,
        status: ShareLinkStatus,
    ): Long

    @Query(
        "select count(l) from ShareLink l where l.accountId = :accountId and l.status = :open " +
            "and (l.expireDate is null or l.expireDate >= :today)",
    )
    fun countOpen(
        @Param("accountId") accountId: Long,
        @Param("open") open: ShareLinkStatus,
        @Param("today") today: LocalDate,
    ): Long

    @Modifying(flushAutomatically = true)
    @Query("delete from ShareLink l where l.accountId = :accountId")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int
}
