package com.energycal.share.dto

import com.energycal.common.AllowedText
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

data class ShareLinkCreateRequest(
    @field:NotNull
    @field:AllowedText(min = 1, max = 20)
    val name: String?,
    @field:Size(max = 200)
    val routineIds: List<@NotNull Long>? = null,
    val isOneTimeVisible: Boolean? = null,
    val expiry: LinkExpiry? = null,
)
