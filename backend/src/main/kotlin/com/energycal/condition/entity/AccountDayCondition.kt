package com.energycal.condition.entity

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
@Table(name = "account_day_condition")
class AccountDayCondition(
    @Column(name = "account_id", nullable = false)
    var accountId: Long,
    @Column(name = "condition_date", nullable = false)
    var conditionDate: LocalDate,
    @Enumerated(EnumType.STRING)
    @Column(name = "condition_level", length = 10, nullable = false)
    var conditionLevel: ConditionLevel,
    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime,
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_day_condition_id")
    val id: Long = 0
}
