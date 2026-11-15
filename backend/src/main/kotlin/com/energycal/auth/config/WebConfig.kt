package com.energycal.auth.config

import com.energycal.account.repository.AccountRepository
import com.energycal.auth.filter.AuthFilter
import com.energycal.auth.resolver.LoginUserArgumentResolver
import com.energycal.auth.service.JwtProvider
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
@EnableConfigurationProperties(JwtProperties::class)
class WebConfig : WebMvcConfigurer {
    // @Component로 등록하면 /api/* 외 경로에도 적용됨
    @Bean
    fun authFilterRegistration(
        jwtProvider: JwtProvider,
        accountRepository: AccountRepository,
    ): FilterRegistrationBean<AuthFilter> =
        FilterRegistrationBean(AuthFilter(jwtProvider, accountRepository)).apply {
            addUrlPatterns("/api/*")
            order = 1
        }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
        resolvers.add(LoginUserArgumentResolver())
    }
}
