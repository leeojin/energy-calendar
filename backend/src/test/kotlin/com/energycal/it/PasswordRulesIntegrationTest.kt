package com.energycal.it

import com.energycal.account.repository.AccountRepository
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import kotlin.test.assertEquals

class PasswordRulesIntegrationTest : IntegrationTestSupport() {
    @Autowired
    private lateinit var accountRepository: AccountRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Test
    fun `지금 규칙에 맞지 않는 예전 비밀번호로도 로그인된다`() {
        listOf(" ".repeat(8), "a".repeat(62) + "😀😀", "12345678", "가나다라마바사아").forEachIndexed { i, password ->
            val username = "pwold$i"
            signup(username, "10.0.6.${i + 1}")
            val account = checkNotNull(accountRepository.findByUsername(username))
            account.passwordHash = passwordEncoder.encode(password)!!
            accountRepository.saveAndFlush(account)

            assertEquals(200, login(username, password, "10.0.6.${i + 1}"))
        }
    }

    @Test
    fun `규칙에 맞지 않는 새 비밀번호는 가입에서 거부한다`() {
        listOf("Abcd 1234", "Abcd123가", "Abcd123😀", "abcd1234", "Abcd12345678901234").forEach { password ->
            val status =
                mockMvc
                    .post("/api/auth/signup") {
                        contentType = MediaType.APPLICATION_JSON
                        content = """{"username":"pwrule","password":"$password","turnstileToken":"test-token"}"""
                    }.andReturn()
                    .response.status
            assertEquals(400, status)
        }
    }

    @Test
    fun `아이디에 밑줄이 있으면 가입에서 거부한다`() {
        listOf("sujin_k", "_abcd", "abcd_").forEach { username ->
            val status =
                mockMvc
                    .post("/api/auth/signup") {
                        contentType = MediaType.APPLICATION_JSON
                        content = """{"username":"$username","password":"Pw-test-123","turnstileToken":"test-token"}"""
                    }.andReturn()
                    .response.status
            assertEquals(400, status)
        }
    }

    @Test
    fun `비밀번호 바꾸기는 방금 로그인한 토큰으로만 된다`() {
        val fresh = signup("pwchangeok", "10.0.7.1")
        assertEquals(204, changePassword(fresh, "10.0.7.1"))

        val stale = signup("pwchangeold", "10.0.7.2")
        val account = checkNotNull(accountRepository.findByUsername("pwchangeold"))
        account.lastLoginAt = checkNotNull(account.lastLoginAt).minusMinutes(10)
        accountRepository.saveAndFlush(account)
        val result =
            mockMvc
                .patch("/api/me/password") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"currentPassword":"Pw-test-123","newPassword":"Pw-next-456"}"""
                    cookie(stale)
                    with {
                        it.remoteAddr = "10.0.7.2"
                        it
                    }
                }.andReturn()
        assertEquals(401, result.response.status)
        assertEquals(true, result.response.contentAsString.contains("REAUTH_REQUIRED"))
    }

    @Test
    fun `탈퇴는 아이디와 비밀번호가 맞아야만 된다`() {
        val cookie = signup("byeuser", "10.0.8.1")
        val summary =
            mockMvc
                .get("/api/me/delete-summary") { cookie(cookie) }
                .andReturn()
                .response
        assertEquals(200, summary.status)
        assertEquals(true, summary.contentAsString.contains("\"taskCount\":0"))

        assertEquals(400, deleteMe(cookie, null, "10.0.8.1"))
        assertEquals(401, deleteMe(cookie, """{"username":"byeuser","password":"Wrong-pass-1"}""", "10.0.8.1"))
        assertEquals(401, deleteMe(cookie, """{"username":"otheruser","password":"Pw-test-123"}""", "10.0.8.1"))
        assertEquals(true, accountRepository.findByUsername("byeuser") != null)

        val account = checkNotNull(accountRepository.findByUsername("byeuser"))
        account.lastLoginAt = checkNotNull(account.lastLoginAt).minusMinutes(10)
        accountRepository.saveAndFlush(account)
        assertEquals(204, deleteMe(cookie, """{"username":"byeuser","password":"Pw-test-123"}""", "10.0.8.1"))
        assertEquals(null, accountRepository.findByUsername("byeuser"))
    }

    private fun deleteMe(
        cookie: Cookie,
        body: String?,
        ip: String,
    ): Int =
        mockMvc
            .delete("/api/me") {
                cookie(cookie)
                if (body != null) {
                    contentType = MediaType.APPLICATION_JSON
                    content = body
                }
                with {
                    it.remoteAddr = ip
                    it
                }
            }.andReturn()
            .response.status

    private fun changePassword(
        cookie: Cookie,
        ip: String,
    ): Int =
        mockMvc
            .patch("/api/me/password") {
                contentType = MediaType.APPLICATION_JSON
                content = """{"currentPassword":"Pw-test-123","newPassword":"Pw-next-456"}"""
                cookie(cookie)
                with {
                    it.remoteAddr = ip
                    it
                }
            }.andReturn()
            .response.status

    private fun login(
        username: String,
        password: String,
        ip: String,
    ): Int =
        mockMvc
            .post("/api/auth/login") {
                contentType = MediaType.APPLICATION_JSON
                content = """{"username":"$username","password":"$password"}"""
                with {
                    it.remoteAddr = ip
                    it
                }
            }.andReturn()
            .response.status
}
