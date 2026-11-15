package com.energycal.share.dto

import com.energycal.common.AllowedText
import jakarta.validation.constraints.NotNull

data class ShareLinkCommentCreateRequest(
    @field:NotNull
    @field:AllowedText(min = 1, max = 10)
    val nickname: String?,
    @field:NotNull
    @field:AllowedText(min = 1, max = 30)
    val body: String?,
)
