package com.energycal.it

import com.energycal.auth.controller.AuthCookie
import com.energycal.auth.service.TurnstileVerifier
import jakarta.servlet.http.Cookie
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.mysql.MySQLContainer
import org.testcontainers.utility.DockerImageName
import java.time.Clock
import java.time.Instant
import java.time.ZoneId

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
@Import(IntegrationTestSupport.FixedBeans::class)
abstract class IntegrationTestSupport {
    @Autowired
    protected lateinit var mockMvc: MockMvc

    @TestConfiguration(proxyBeanMethods = false)
    class FixedBeans {
        @Bean
        @Primary
        fun fixedClock(): Clock = Clock.fixed(Instant.parse("2026-11-04T01:00:00Z"), ZoneId.of("Asia/Seoul"))

        @Bean
        @Primary
        fun alwaysPassTurnstile(): TurnstileVerifier =
            object : TurnstileVerifier {
                override fun verify(
                    token: String,
                    remoteIp: String,
                ): Boolean = true
            }
    }

    protected fun signup(
        username: String,
        ip: String,
    ): Cookie {
        val result =
            mockMvc
                .post("/api/auth/signup") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"username":"$username","password":"Pw-test-123","turnstileToken":"test-token"}"""
                    with {
                        it.remoteAddr = ip
                        it
                    }
                }.andReturn()
        check(result.response.status == 201) { "가입 실패: ${result.response.status} ${result.response.contentAsString}" }
        return checkNotNull(result.response.getCookie(AuthCookie.NAME)) { "가입 응답에 쿠키가 없음" }
    }

    companion object {
        private val mysql: MySQLContainer =
            MySQLContainer(DockerImageName.parse("mysql:8.4")).apply { start() }

        @JvmStatic
        @DynamicPropertySource
        fun datasource(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { mysql.jdbcUrl }
            registry.add("spring.datasource.username") { mysql.username }
            registry.add("spring.datasource.password") { mysql.password }
        }
    }
}
