package com.energycal.routine.service

import com.energycal.routine.repository.RoutineRepository
import com.energycal.task.entity.Task
import com.energycal.task.entity.TimeSlot
import com.energycal.task.repository.TaskRepository
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime

// 유니크 충돌 시 상위 트랜잭션 롤백 방지
@Component
class OccurrenceWriter(
    private val taskRepository: TaskRepository,
    private val routineRepository: RoutineRepository,
    private val clock: Clock,
) {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun insertIfAbsent(
        accountId: Long,
        routineId: Long,
        occurrenceDate: LocalDate,
        timeSlot: TimeSlot,
        energyCost: Int,
    ): Boolean {
        if (taskRepository.existsByRoutineIdAndOccurrenceDate(routineId, occurrenceDate)) {
            return false
        }
        val now = LocalDateTime.now(clock)
        val task =
            Task(
                accountId = accountId,
                routine = routineRepository.getReferenceById(routineId),
                occurrenceDate = occurrenceDate,
                name = null,
                plannedDate = occurrenceDate,
                timeSlot = timeSlot,
                energyCost = energyCost,
                createdAt = now,
                updatedAt = now,
            )
        taskRepository.saveAndFlush(task)
        return true
    }
}
