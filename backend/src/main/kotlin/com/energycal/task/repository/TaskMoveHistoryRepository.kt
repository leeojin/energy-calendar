package com.energycal.task.repository

import com.energycal.task.entity.Task
import com.energycal.task.entity.TaskMoveHistory
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface TaskMoveHistoryRepository : JpaRepository<TaskMoveHistory, Long> {
    fun countByTaskId(taskId: Long): Long

    @Query(
        "select h from TaskMoveHistory h join fetch h.task t left join fetch t.routine " +
            "where t.id = :taskId order by h.createdAt, h.id",
    )
    fun findAllByTaskIdOldestFirst(
        @Param("taskId") taskId: Long,
    ): List<TaskMoveHistory>

    @Query(
        "select h from TaskMoveHistory h join fetch h.task t left join fetch t.routine " +
            "where t.accountId = :accountId and h.createdAt >= :from and h.createdAt < :to " +
            "order by h.createdAt desc, h.id desc",
    )
    fun findAllOfAccountInRangeNewestFirst(
        @Param("accountId") accountId: Long,
        @Param("from") from: LocalDateTime,
        @Param("to") to: LocalDateTime,
    ): List<TaskMoveHistory>

    @Modifying
    @Query("delete from TaskMoveHistory h where h.createdAt < :cutoff")
    fun deleteByCreatedAtBefore(
        @Param("cutoff") cutoff: LocalDateTime,
    ): Int

    @Modifying(flushAutomatically = true)
    @Query("delete from TaskMoveHistory h where h.task.id in (select t.id from Task t where t.accountId = :accountId)")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int
}
