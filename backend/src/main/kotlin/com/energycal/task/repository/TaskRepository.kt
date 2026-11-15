package com.energycal.task.repository

import com.energycal.task.entity.Task
import com.energycal.task.entity.TaskMoveHistory
import com.energycal.task.entity.TaskStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface TaskRepository : JpaRepository<Task, Long> {
    fun findByIdAndAccountIdAndStatusNot(
        id: Long,
        accountId: Long,
        status: TaskStatus,
    ): Task?

    fun countByAccountIdAndPlannedDateAndStatusNot(
        accountId: Long,
        plannedDate: LocalDate,
        status: TaskStatus,
    ): Long

    fun countByAccountIdAndStatusNot(
        accountId: Long,
        status: TaskStatus,
    ): Long

    fun existsByRoutineIdAndOccurrenceDate(
        routineId: Long,
        occurrenceDate: LocalDate,
    ): Boolean

    @Query("select count(h) from TaskMoveHistory h where h.task.id = :taskId")
    fun countMovesByTaskId(
        @Param("taskId") taskId: Long,
    ): Long

    @Query(
        "select t from Task t left join fetch t.routine " +
            "where t.accountId = :accountId and t.plannedDate between :from and :to and t.status <> :excluded " +
            "order by t.plannedDate, t.id",
    )
    fun findInRangeWithRoutine(
        @Param("accountId") accountId: Long,
        @Param("from") from: LocalDate,
        @Param("to") to: LocalDate,
        @Param("excluded") excluded: TaskStatus,
    ): List<Task>

    @Query(
        "select t from Task t " +
            "where t.accountId = :accountId and t.routine is null and t.status = :status " +
            "and t.plannedDate >= :from and t.plannedDate < :before " +
            "order by t.plannedDate, t.id",
    )
    fun findOneTimeInRangeByStatus(
        @Param("accountId") accountId: Long,
        @Param("from") from: LocalDate,
        @Param("before") before: LocalDate,
        @Param("status") status: TaskStatus,
    ): List<Task>

    @Query("select h.task.id, count(h) from TaskMoveHistory h where h.task.id in :ids group by h.task.id")
    fun countMovesByTaskIds(
        @Param("ids") ids: Collection<Long>,
    ): List<Array<Any>>

    @Modifying(flushAutomatically = true)
    @Query("delete from Task t where t.accountId = :accountId")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int
}
