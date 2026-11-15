package com.energycal.account.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "account")
class Account(
    @Column(name = "username", length = 20, nullable = false)
    var username: String,
    @Column(name = "nickname", length = 20, nullable = false)
    var nickname: String,
    @Column(name = "password_hash", columnDefinition = "CHAR(60)", nullable = false)
    var passwordHash: String,
    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime,
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_id")
    val id: Long = 0

    @Column(name = "token_version", nullable = false)
    var tokenVersion: Int = 0

    @Column(name = "last_login_at")
    var lastLoginAt: LocalDateTime? = null
}
