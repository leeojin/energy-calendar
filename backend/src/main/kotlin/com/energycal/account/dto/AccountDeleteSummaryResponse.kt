package com.energycal.account.dto

data class AccountDeleteSummaryResponse(
    val taskCount: Long,
    val shareLinkCount: Long,
    val commentCount: Long,
)
