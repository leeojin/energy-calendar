package com.energycal.share.repository

import com.energycal.share.entity.ShareLink
import com.energycal.share.entity.ShareLinkComment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface ShareLinkCommentRepository : JpaRepository<ShareLinkComment, Long> {
    @Query(
        "select c.shareLink.id as shareLinkId, count(c) as commentCount from ShareLinkComment c " +
            "where c.shareLink.id in :shareLinkIds group by c.shareLink.id",
    )
    fun countByShareLinkIds(
        @Param("shareLinkIds") shareLinkIds: Collection<Long>,
    ): List<ShareLinkCommentCount>

    @Query(
        "select c from ShareLinkComment c where c.shareLink.id = :shareLinkId " +
            "and c.createdAt >= :from and c.createdAt < :to order by c.createdAt, c.id",
    )
    fun findAllInRange(
        @Param("shareLinkId") shareLinkId: Long,
        @Param("from") from: LocalDateTime,
        @Param("to") to: LocalDateTime,
    ): List<ShareLinkComment>

    fun findAllByShareLinkIdOrderByCreatedAtDescIdDesc(shareLinkId: Long): List<ShareLinkComment>

    @Query("select c from ShareLinkComment c where c.id = :id and c.shareLink.accountId = :accountId")
    fun findOwned(
        @Param("id") id: Long,
        @Param("accountId") accountId: Long,
    ): ShareLinkComment?

    @Query(
        "select c from ShareLinkComment c join fetch c.shareLink l where l.accountId = :accountId " +
            "and c.createdAt >= :from and c.createdAt < :to order by c.createdAt desc, c.id desc",
    )
    fun findAllOfAccountInRange(
        @Param("accountId") accountId: Long,
        @Param("from") from: LocalDateTime,
        @Param("to") to: LocalDateTime,
    ): List<ShareLinkComment>

    @Modifying(flushAutomatically = true)
    @Query("delete from ShareLinkComment c where c.shareLink.id = :shareLinkId")
    fun deleteAllByShareLinkId(
        @Param("shareLinkId") shareLinkId: Long,
    ): Int

    @Query("select count(c) from ShareLinkComment c where c.shareLink.accountId = :accountId")
    fun countAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Long

    @Modifying(flushAutomatically = true)
    @Query("delete from ShareLinkComment c where c.shareLink.id in (select l.id from ShareLink l where l.accountId = :accountId)")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int

    interface ShareLinkCommentCount {
        val shareLinkId: Long
        val commentCount: Long
    }
}
