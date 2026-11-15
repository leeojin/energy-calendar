package com.energycal.share.repository

import com.energycal.share.entity.ShareLink
import com.energycal.share.entity.ShareLinkRoutine
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ShareLinkRoutineRepository : JpaRepository<ShareLinkRoutine, Long> {
    fun existsByShareLinkIdAndRoutineId(
        shareLinkId: Long,
        routineId: Long,
    ): Boolean

    fun countByShareLinkId(shareLinkId: Long): Long

    @Query(
        "select slr.shareLink.id as shareLinkId, slr.routine.id as routineId from ShareLinkRoutine slr " +
            "where slr.shareLink.id in :shareLinkIds order by slr.id",
    )
    fun findPairsByShareLinkIds(
        @Param("shareLinkIds") shareLinkIds: Collection<Long>,
    ): List<ShareLinkRoutinePair>

    @Modifying(flushAutomatically = true)
    @Query("delete from ShareLinkRoutine slr where slr.shareLink.id = :shareLinkId and slr.routine.id = :routineId")
    fun deleteByShareLinkIdAndRoutineId(
        @Param("shareLinkId") shareLinkId: Long,
        @Param("routineId") routineId: Long,
    ): Int

    @Modifying(flushAutomatically = true)
    @Query("delete from ShareLinkRoutine slr where slr.shareLink.id = :shareLinkId")
    fun deleteAllByShareLinkId(
        @Param("shareLinkId") shareLinkId: Long,
    ): Int

    @Modifying(flushAutomatically = true)
    @Query("delete from ShareLinkRoutine slr where slr.shareLink.id in (select l.id from ShareLink l where l.accountId = :accountId)")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int

    interface ShareLinkRoutinePair {
        val shareLinkId: Long
        val routineId: Long
    }
}
