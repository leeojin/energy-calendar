package com.energycal.routine.repository

import com.energycal.routine.entity.Routine
import com.energycal.routine.entity.RoutineStatus
import com.energycal.task.entity.TaskStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.time.LocalDateTime

interface RoutineRepository : JpaRepository<Routine, Long> {
    fun findByIdAndAccountId(
        id: Long,
        accountId: Long,
    ): Routine?

    fun findAllByAccountIdOrderByIdAsc(accountId: Long): List<Routine>

    fun countByAccountIdAndStatus(
        accountId: Long,
        status: RoutineStatus,
    ): Long

    fun countByAccountId(accountId: Long): Long

    fun findAllByAccountIdAndStatusOrderByIdAsc(
        accountId: Long,
        status: RoutineStatus,
    ): List<Routine>

    @Modifying(flushAutomatically = true)
    @Query(
        "update Task t set t.energyCost = :energyCost, t.updatedAt = :now, t.version = t.version + 1 " +
            "where t.routine.id = :routineId and t.plannedDate >= :today and t.status = :planned",
    )
    fun updateFuturePlannedTaskCost(
        @Param("routineId") routineId: Long,
        @Param("energyCost") energyCost: Int,
        @Param("today") today: LocalDate,
        @Param("now") now: LocalDateTime,
        @Param("planned") planned: TaskStatus,
    ): Int

    @Modifying(flushAutomatically = true)
    @Query(
        "update Task t set t.status = :deleted, t.updatedAt = :now, t.version = t.version + 1 " +
            "where t.routine.id = :routineId and t.plannedDate > :today and t.status = :planned",
    )
    fun deleteFuturePlannedTasks(
        @Param("routineId") routineId: Long,
        @Param("today") today: LocalDate,
        @Param("now") now: LocalDateTime,
        @Param("planned") planned: TaskStatus,
        @Param("deleted") deleted: TaskStatus,
    ): Int

    @Modifying(flushAutomatically = true)
    @Query("delete from Routine r where r.accountId = :accountId")
    fun deleteAllOfAccount(
        @Param("accountId") accountId: Long,
    ): Int
}
