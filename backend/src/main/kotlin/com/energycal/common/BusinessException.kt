package com.energycal.common

class BusinessException(
    val errorCode: ErrorCode,
) : RuntimeException(errorCode.name)
