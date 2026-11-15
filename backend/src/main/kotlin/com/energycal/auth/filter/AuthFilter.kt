package com.energycal.auth.filter

import com.energycal.account.repository.AccountRepository
import com.energycal.auth.controller.AuthCookie
import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.service.JwtProvider
import com.energycal.calc.EnergyCalc
import com.energycal.common.ErrorCode
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.MediaType
import org.springframework.web.filter.OncePerRequestFilter
import org.springframework.web.util.WebUtils
import java.time.LocalDateTime

class AuthFilter(
    private val jwtProvider: JwtProvider,
    private val accountRepository: AccountRepository,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        if (isPublic(pathOf(request))) {
            filterChain.doFilter(request, response)
            return
        }
        val login = authenticate(request)
        if (login == null) {
            writeAuthRequired(response)
            return
        }
        request.setAttribute(LOGIN_ACCOUNT, login)
        filterChain.doFilter(request, response)
    }

    private fun authenticate(request: HttpServletRequest): LoginAccount? {
        val token = WebUtils.getCookie(request, AuthCookie.NAME)?.value
        if (token.isNullOrBlank()) return null
        val claims = jwtProvider.parse(token) ?: return null
        val accountId = claims.subject?.toLongOrNull() ?: return null
        val version = (claims[JwtProvider.CLAIM_VERSION] as? Number)?.toInt() ?: return null
        val issuedAt = claims.issuedAt ?: return null
        val account = accountRepository.findById(accountId).orElse(null) ?: return null
        if (account.tokenVersion != version) return null
        return LoginAccount(accountId, LocalDateTime.ofInstant(issuedAt.toInstant(), EnergyCalc.ZONE))
    }

    private fun writeAuthRequired(response: HttpServletResponse) {
        response.status = ErrorCode.AUTH_REQUIRED.httpStatus
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = Charsets.UTF_8.name()
        response.writer.write("""{"code":"${ErrorCode.AUTH_REQUIRED.name}"}""")
    }

    private fun pathOf(request: HttpServletRequest): String = request.servletPath + (request.pathInfo ?: "")

    private fun isPublic(path: String): Boolean = path in PUBLIC_PATHS || path.startsWith(PUBLIC_PREFIX)

    companion object {
        const val LOGIN_ACCOUNT = "com.energycal.auth.LOGIN_ACCOUNT"
        private val PUBLIC_PATHS = setOf("/api/health", "/api/auth/signup", "/api/auth/login")
        private const val PUBLIC_PREFIX = "/api/public/"
    }
}
