package com.energycal.common

data class ErrorResponse(
    val code: String,
) {
    companion object {
        fun of(errorCode: ErrorCode) = ErrorResponse(errorCode.name)
    }
}
