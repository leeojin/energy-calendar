package com.energycal.share.dto

import com.energycal.share.entity.ShareLinkComment
import java.time.LocalDateTime

data class PublicCommentResponse(
    val nickname: String,
    val body: String,
    val createdAt: LocalDateTime,
)

fun ShareLinkComment.toPublicResponse(): PublicCommentResponse =
    PublicCommentResponse(nickname = nickname, body = body, createdAt = createdAt)
