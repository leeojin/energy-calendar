package com.energycal.share.dto

import com.energycal.calc.EnergyCalc
import com.energycal.share.entity.ShareLinkComment
import java.time.LocalDate
import java.time.LocalDateTime

data class ShareLinkCommentResponse(
    val shareLinkCommentId: Long,
    val nickname: String,
    val body: String,
    val createdAt: LocalDateTime,
    val weekStart: LocalDate,
)

fun ShareLinkComment.toResponse(): ShareLinkCommentResponse =
    ShareLinkCommentResponse(
        shareLinkCommentId = id,
        nickname = nickname,
        body = body,
        createdAt = createdAt,
        weekStart = EnergyCalc.weekStart(createdAt.toLocalDate()),
    )
