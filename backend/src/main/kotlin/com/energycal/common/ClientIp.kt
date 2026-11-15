package com.energycal.common

import jakarta.servlet.http.HttpServletRequest

// 프록시 헤더 처리는 RemoteIpValve에 위임
object ClientIp {
    fun of(request: HttpServletRequest): String = request.remoteAddr
}
