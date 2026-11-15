package com.energycal.share.dto

import com.energycal.calc.EnergyCalc
import com.energycal.share.entity.ShareLink
import com.energycal.share.entity.ShareLinkStatus
import java.time.LocalDate
import java.time.LocalDateTime

data class ShareLinkResponse(
    val shareLinkId: Long,
    val name: String,
    val token: String,
    val status: ShareLinkStatus,
    val isExpired: Boolean,
    val expireDate: LocalDate?,
    val isOneTimeVisible: Boolean,
    val routineIds: List<Long>,
    val commentCount: Long,
    val createdAt: LocalDateTime,
    val closedAt: LocalDateTime?,
)

fun ShareLink.toResponse(
    today: LocalDate,
    routineIds: List<Long>,
    commentCount: Long,
): ShareLinkResponse =
    ShareLinkResponse(
        shareLinkId = id,
        name = name,
        token = token,
        status = status,
        isExpired = status == ShareLinkStatus.OPEN && !EnergyCalc.isLinkOpen(status, expireDate, today),
        expireDate = expireDate,
        isOneTimeVisible = isOneTimeVisible,
        routineIds = routineIds,
        commentCount = commentCount,
        createdAt = createdAt,
        closedAt = closedAt,
    )
