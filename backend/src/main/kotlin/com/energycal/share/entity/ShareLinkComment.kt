package com.energycal.share.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "share_link_comment")
class ShareLinkComment(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "share_link_id", nullable = false)
    var shareLink: ShareLink,
    @Column(name = "nickname", length = 10, nullable = false)
    var nickname: String,
    @Column(name = "body", length = 30, nullable = false)
    var body: String,
    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "share_link_comment_id")
    val id: Long = 0
}
