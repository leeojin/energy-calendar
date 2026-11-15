package com.energycal.routine.entity

import com.energycal.task.entity.TimeSlot
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "routine")
class Routine(
    @Column(name = "account_id", nullable = false)
    var accountId: Long,
    @Column(name = "name", length = 20, nullable = false)
    var name: String,
    @Column(name = "energy_cost", columnDefinition = "TINYINT", nullable = false)
    var energyCost: Int,
    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", length = 10, nullable = false)
    var timeSlot: TimeSlot,
    @Column(name = "weekdays", columnDefinition = "TINYINT", nullable = false)
    var weekdays: Int,
    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate,
    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime,
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "routine_id")
    val id: Long = 0

    @Column(name = "end_date")
    var endDate: LocalDate? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 10, nullable = false)
    var status: RoutineStatus = RoutineStatus.ACTIVE
}
