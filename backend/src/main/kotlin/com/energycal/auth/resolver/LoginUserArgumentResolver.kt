package com.energycal.auth.resolver

import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.filter.AuthFilter
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import jakarta.servlet.http.HttpServletRequest
import org.springframework.core.MethodParameter
import org.springframework.web.bind.support.WebDataBinderFactory
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.method.support.ModelAndViewContainer

class LoginUserArgumentResolver : HandlerMethodArgumentResolver {
    override fun supportsParameter(parameter: MethodParameter): Boolean =
        parameter.hasParameterAnnotation(LoginUser::class.java) &&
            parameter.parameterType in SUPPORTED_TYPES

    override fun resolveArgument(
        parameter: MethodParameter,
        mavContainer: ModelAndViewContainer?,
        webRequest: NativeWebRequest,
        binderFactory: WebDataBinderFactory?,
    ): Any {
        val request = webRequest.getNativeRequest(HttpServletRequest::class.java)
        val login =
            request?.getAttribute(AuthFilter.LOGIN_ACCOUNT) as? LoginAccount
                ?: throw BusinessException(ErrorCode.AUTH_REQUIRED)
        return if (parameter.parameterType == LoginAccount::class.java) login else login.accountId
    }

    companion object {
        private val SUPPORTED_TYPES =
            setOf(LoginAccount::class.java, Long::class.javaPrimitiveType, Long::class.javaObjectType)
    }
}
