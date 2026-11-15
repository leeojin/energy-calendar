package com.energycal.account.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "account_budget_history")
class AccountBudgetHistory(
    @Column(name = "account_id", nullable = false)
    var accountId: Long,
    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate,
    @Column(name = "energy_budget", columnDefinition = "TINYINT", nullable = false)
    var energyBudget: Int,
    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime,
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_budget_history_id")
    val id: Long = 0
}
