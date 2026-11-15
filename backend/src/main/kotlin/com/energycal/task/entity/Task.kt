package com.energycal.task.entity

import com.energycal.routine.entity.Routine
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "task")
class Task(
    @Column(name = "account_id", nullable = false)
    var accountId: Long,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_id")
    var routine: Routine?,
    @Column(name = "occurrence_date")
    var occurrenceDate: LocalDate?,
    @Column(name = "name", length = 20)
    var name: String?,
    @Column(name = "planned_date", nullable = false)
    var plannedDate: LocalDate,
    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", length = 10, nullable = false)
    var timeSlot: TimeSlot,
    @Column(name = "energy_cost", columnDefinition = "TINYINT", nullable = false)
    var energyCost: Int,
    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime,
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    val id: Long = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 10, nullable = false)
    var status: TaskStatus = TaskStatus.PLANNED

    @Column(name = "is_visible", nullable = false)
    var isVisible: Boolean = false

    @Column(name = "completed_at")
    var completedAt: LocalDateTime? = null

    @Version
    @Column(name = "version", nullable = false)
    var version: Int = 0
}
