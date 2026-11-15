package com.energycal.task.entity

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
import org.hibernate.annotations.Immutable
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Immutable
@Table(name = "task_move_history")
class TaskMoveHistory(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    val task: Task,
    @Column(name = "from_date", nullable = false)
    val fromDate: LocalDate,
    @Enumerated(EnumType.STRING)
    @Column(name = "from_time_slot", length = 10, nullable = false)
    val fromTimeSlot: TimeSlot,
    @Column(name = "to_date", nullable = false)
    val toDate: LocalDate,
    @Enumerated(EnumType.STRING)
    @Column(name = "to_time_slot", length = 10, nullable = false)
    val toTimeSlot: TimeSlot,
    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_move_history_id")
    val id: Long = 0
}
