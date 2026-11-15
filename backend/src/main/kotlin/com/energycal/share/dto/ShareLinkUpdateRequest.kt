package com.energycal.share.dto

data class ShareLinkUpdateRequest(
    val isOneTimeVisible: Boolean? = null,
    val expiry: LinkExpiry? = null,
)
