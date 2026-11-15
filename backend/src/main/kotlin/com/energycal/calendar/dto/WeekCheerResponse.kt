package com.energycal.calendar.dto

import com.energycal.share.entity.ShareLinkStatus
import java.time.LocalDateTime

data class WeekCheerResponse(
    val shareLinkCommentId: Long,
    val shareLinkId: Long,
    val linkName: String,
    val linkStatus: ShareLinkStatus,
    val nickname: String,
    val body: String,
    val createdAt: LocalDateTime,
)
