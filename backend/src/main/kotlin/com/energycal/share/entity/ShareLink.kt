package com.energycal.share.entity

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
@Table(name = "share_link")
class ShareLink(
    @Column(name = "account_id", nullable = false)
    var accountId: Long,
    @Column(name = "token", length = 32, nullable = false)
    var token: String,
    @Column(name = "name", length = 20, nullable = false)
    var name: String,
    @Column(name = "is_one_time_visible", nullable = false)
    var isOneTimeVisible: Boolean,
    @Column(name = "expire_date")
    var expireDate: LocalDate?,
    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime,
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "share_link_id")
    val id: Long = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 10, nullable = false)
    var status: ShareLinkStatus = ShareLinkStatus.OPEN

    @Column(name = "closed_at")
    var closedAt: LocalDateTime? = null
}
