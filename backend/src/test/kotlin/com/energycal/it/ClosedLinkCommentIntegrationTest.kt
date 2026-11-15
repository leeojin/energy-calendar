package com.energycal.it

import com.energycal.share.repository.ShareLinkCommentRepository
import com.energycal.share.repository.ShareLinkRepository
import com.jayway.jsonpath.JsonPath
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class ClosedLinkCommentIntegrationTest : IntegrationTestSupport() {
    @Autowired
    private lateinit var shareLinkRepository: ShareLinkRepository

    @Autowired
    private lateinit var shareLinkCommentRepository: ShareLinkCommentRepository

    @Test
    fun `열린 링크에만 응원을 쓸 수 있고 닫힘 만료 지움은 모두 같은 404다`() {
        val cookie = signup("cmtowner", "10.0.5.1")
        val open = createLink(cookie, "열림")
        val closed = createLink(cookie, "닫힘")
        val expired = createLink(cookie, "만료")
        val deleted = createLink(cookie, "지움")
        val wiped = createLink(cookie, "모두지움")

        val written = postComment(open.token, "10.0.5.10", 201)
        assertEquals("졸린 수달", JsonPath.read<String>(written, "$.nickname"))
        assertEquals("화이팅 👏", JsonPath.read<String>(written, "$.body"))
        assertFalse(written.contains("Id\""), "응원 쓰기 응답에 id가 있으면 안 된다: $written")
        val openBody = getPublic(open.token, 200)
        assertEquals(listOf("화이팅 👏"), JsonPath.read<List<String>>(openBody, "$.comments[*].body"))

        mockMvc.post("/api/share-links/${closed.id}/close") { cookie(cookie) }.andExpect { status { isOk() } }
        val closedGet = getPublic(closed.token, 404)
        val closedPost = postComment(closed.token, "10.0.5.11", 404)

        val expiredLink = shareLinkRepository.findById(expired.id).orElseThrow()
        expiredLink.expireDate = LocalDate.of(2026, 11, 3)
        shareLinkRepository.save(expiredLink)
        val expiredGet = getPublic(expired.token, 404)
        val expiredPost = postComment(expired.token, "10.0.5.12", 404)

        mockMvc.post("/api/share-links/${deleted.id}/close") { cookie(cookie) }.andExpect { status { isOk() } }
        mockMvc.delete("/api/share-links/${deleted.id}") { cookie(cookie) }.andExpect { status { isNoContent() } }
        val deletedGet = getPublic(deleted.token, 404)
        val deletedPost = postComment(deleted.token, "10.0.5.13", 404)

        mockMvc.post("/api/share-links/${wiped.id}/close") { cookie(cookie) }.andExpect { status { isOk() } }
        mockMvc.delete("/api/share-links/${wiped.id}/with-comments") { cookie(cookie) }.andExpect { status { isNoContent() } }
        val wipedGet = getPublic(wiped.token, 404)
        val wipedPost = postComment(wiped.token, "10.0.5.14", 404)

        val missing = getPublic("AAAAAAAAAAAAAAAAAAAAAA", 404)
        assertEquals("""{"code":"SHARE_LINK_NOT_FOUND"}""", missing)
        for (body in listOf(closedGet, closedPost, expiredGet, expiredPost, deletedGet, deletedPost, wipedGet, wipedPost)) {
            assertEquals(missing, body)
        }

        val counts =
            shareLinkCommentRepository
                .countByShareLinkIds(listOf(open.id, closed.id, expired.id, deleted.id))
                .associate { it.shareLinkId to it.commentCount }
        assertEquals(mapOf(open.id to 1L), counts)
    }

    @Test
    fun `지운 링크의 응원은 주 화면에 남고 주인이 지울 수 있다`() {
        val cookie = signup("cmtweek", "10.0.5.2")
        val link = createLink(cookie, "운동")
        postComment(link.token, "10.0.5.20", 201)

        val list =
            mockMvc
                .get("/api/share-links/${link.id}/comments") { cookie(cookie) }
                .andExpect { status { isOk() } }
                .andReturn()
                .response
                .getContentAsString(Charsets.UTF_8)
        assertEquals("2026-11-02", JsonPath.read<String>(list, "$[0].weekStart"))
        val commentId = JsonPath.read<Number>(list, "$[0].shareLinkCommentId").toLong()

        assertEquals("OPEN", weekCheer(cookie, "$.cheers[0].linkStatus"))
        assertEquals("운동", weekCheer(cookie, "$.cheers[0].linkName"))

        mockMvc.post("/api/share-links/${link.id}/close") { cookie(cookie) }.andExpect { status { isOk() } }
        mockMvc.delete("/api/share-links/${link.id}") { cookie(cookie) }.andExpect { status { isNoContent() } }
        assertEquals("DELETED", weekCheer(cookie, "$.cheers[0].linkStatus"))
        mockMvc.get("/api/share-links/${link.id}/comments") { cookie(cookie) }.andExpect {
            status { isNotFound() }
            jsonPath("$.code") { value("SHARE_LINK_NOT_FOUND") }
        }

        mockMvc.delete("/api/share-link-comments/$commentId") { cookie(cookie) }.andExpect { status { isNoContent() } }
        mockMvc.get("/api/weeks/2026-11-02") { cookie(cookie) }.andExpect {
            status { isOk() }
            jsonPath("$.cheers.length()") { value(0) }
        }
    }

    private data class CreatedLink(
        val id: Long,
        val token: String,
    )

    private fun createLink(
        cookie: Cookie,
        name: String,
    ): CreatedLink {
        val body =
            mockMvc
                .post("/api/share-links") {
                    cookie(cookie)
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"$name","routineIds":[],"isOneTimeVisible":false,"expiry":"NONE"}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
        return CreatedLink(JsonPath.read<Number>(body, "$.shareLinkId").toLong(), JsonPath.read(body, "$.token"))
    }

    private fun postComment(
        token: String,
        ip: String,
        expectedStatus: Int,
    ): String {
        val result =
            mockMvc
                .post("/api/public/share/$token/comments") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"nickname":"졸린 수달","body":"화이팅 👏"}"""
                    with {
                        it.remoteAddr = ip
                        it
                    }
                }.andReturn()
        val body = result.response.getContentAsString(Charsets.UTF_8)
        assertEquals(expectedStatus, result.response.status, body)
        return body
    }

    private fun getPublic(
        token: String,
        expectedStatus: Int,
    ): String {
        val result = mockMvc.get("/api/public/share/$token").andReturn()
        val body = result.response.getContentAsString(Charsets.UTF_8)
        assertEquals(expectedStatus, result.response.status, body)
        return body
    }

    private fun weekCheer(
        cookie: Cookie,
        path: String,
    ): String {
        val body =
            mockMvc
                .get("/api/weeks/2026-11-02") { cookie(cookie) }
                .andExpect { status { isOk() } }
                .andReturn()
                .response
                .getContentAsString(Charsets.UTF_8)
        return JsonPath.read(body, path)
    }
}
