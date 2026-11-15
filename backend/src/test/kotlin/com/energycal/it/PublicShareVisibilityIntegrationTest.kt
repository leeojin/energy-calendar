package com.energycal.it

import com.energycal.account.repository.AccountRepository
import com.energycal.routine.repository.RoutineRepository
import com.energycal.share.entity.ShareLinkComment
import com.energycal.share.repository.ShareLinkCommentRepository
import com.energycal.share.repository.ShareLinkRepository
import com.energycal.task.entity.Task
import com.energycal.task.entity.TaskStatus
import com.energycal.task.entity.TimeSlot
import com.energycal.task.repository.TaskRepository
import com.jayway.jsonpath.JsonPath
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.LocalDate
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PublicShareVisibilityIntegrationTest : IntegrationTestSupport() {
    @Autowired
    private lateinit var taskRepository: TaskRepository

    @Autowired
    private lateinit var routineRepository: RoutineRepository

    @Autowired
    private lateinit var shareLinkRepository: ShareLinkRepository

    @Autowired
    private lateinit var shareLinkCommentRepository: ShareLinkCommentRepository

    @Autowired
    private lateinit var accountRepository: AccountRepository

    @Test
    fun `예시대로 링크마다 고른 할 일만 보이고 비공개 흔적은 없다`() {
        val username = "pubowner"
        val cookie = signup(username, "10.0.4.1")
        val account = checkNotNull(accountRepository.findByUsername(username))
        account.nickname = "비밀별명"
        accountRepository.save(account)

        val walkId = createRoutine(cookie, "산책")
        createRoutine(cookie, "약 먹기")
        mockMvc.post("/api/weeks/2026-11-02/occurrences") { cookie(cookie) }.andExpect { status { isOk() } }
        createTask(cookie, "가족 저녁", "2026-11-05", true)
        createTask(cookie, "치과", "2026-11-06", false)

        val now = LocalDateTime.of(2026, 10, 28, 9, 0)
        taskRepository.save(
            Task(
                accountId = account.id,
                routine = null,
                occurrenceDate = null,
                name = "지난주 모임",
                plannedDate = LocalDate.of(2026, 10, 28),
                timeSlot = TimeSlot.EVENING,
                energyCost = 3,
                createdAt = now,
                updatedAt = now,
            ).apply { isVisible = true },
        )
        val walkRoutine = routineRepository.findById(walkId).orElseThrow()
        taskRepository.save(
            Task(
                accountId = account.id,
                routine = walkRoutine,
                occurrenceDate = LocalDate.of(2026, 10, 28),
                name = null,
                plannedDate = LocalDate.of(2026, 10, 28),
                timeSlot = TimeSlot.MORNING,
                energyCost = 2,
                createdAt = now,
                updatedAt = now,
            ),
        )

        val exercise = createLink(cookie, "운동", "[$walkId]", false)
        val family = createLink(cookie, "가족", "[]", true)

        val thisWeek = LocalDateTime.of(2026, 11, 3, 20, 0)
        val exerciseLink = shareLinkRepository.findById(exercise.id).orElseThrow()
        val familyLink = shareLinkRepository.findById(family.id).orElseThrow()
        shareLinkCommentRepository.save(ShareLinkComment(exerciseLink, "수달", "운동 화이팅", thisWeek))
        shareLinkCommentRepository.save(ShareLinkComment(familyLink, "고양이", "가족 응원", thisWeek))
        shareLinkCommentRepository.save(ShareLinkComment(exerciseLink, "곰", "지난주 응원", now))

        val exerciseBody = getPublic(exercise.token, 200)
        assertEquals("운동", JsonPath.read<String>(exerciseBody, "$.name"))
        assertEquals("2026-11-02", JsonPath.read<String>(exerciseBody, "$.weekStart"))
        assertEquals("2026-11-08", JsonPath.read<String>(exerciseBody, "$.weekEnd"))
        assertEquals("2026-11-04", JsonPath.read<String>(exerciseBody, "$.today"))
        assertEquals(7, JsonPath.read<List<Any>>(exerciseBody, "$.days").size)
        assertEquals(List(5) { "산책" }, taskNames(exerciseBody))
        assertEquals(listOf("운동 화이팅"), JsonPath.read<List<String>>(exerciseBody, "$.comments[*].body"))
        assertEquals(setOf("PLANNED"), JsonPath.read<List<String>>(exerciseBody, "$.days[*].tasks[*].status").toSet())

        val familyBody = getPublic(family.token, 200)
        assertEquals(listOf("가족 저녁"), taskNames(familyBody))
        assertEquals(listOf("가족 응원"), JsonPath.read<List<String>>(familyBody, "$.comments[*].body"))

        val forbidden =
            listOf(
                "치과",
                "약 먹기",
                "지난주",
                "2026-10-28",
                username,
                account.nickname,
                "timeSlot",
                "energyCost",
                "MORNING",
                "conditionLevel",
                "taskId",
                "routineId",
                "shareLinkId",
                "\"id\"",
            )
        for (body in listOf(exerciseBody, familyBody)) {
            for (word in forbidden) {
                assertFalse(body.contains(word), "친구 화면 응답에 '$word'가 있으면 안 된다: $body")
            }
        }

        val walkTask =
            taskRepository
                .findInRangeWithRoutine(account.id, LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 5), TaskStatus.DELETED)
                .first { it.routine?.id == walkId }
        mockMvc.delete("/api/tasks/${walkTask.id}") { cookie(cookie) }.andExpect { status { isNoContent() } }
        val afterDelete = getPublic(exercise.token, 200)
        assertEquals(List(4) { "산책" }, taskNames(afterDelete))
        assertEquals(
            emptyList(),
            JsonPath.read<List<String>>(afterDelete, "$.days[?(@.date == '2026-11-05')].tasks[*].name"),
        )

        mockMvc
            .delete("/api/share-links/${exercise.id}/routines/$walkId") { cookie(cookie) }
            .andExpect { status { isNoContent() } }
        assertEquals(emptyList(), taskNames(getPublic(exercise.token, 200)))

        mockMvc.post("/api/share-links/${family.id}/close") { cookie(cookie) }.andExpect { status { isOk() } }
        val closedBody = getPublic(family.token, 404)
        val missingBody = getPublic("AAAAAAAAAAAAAAAAAAAAAA", 404)
        assertEquals("""{"code":"SHARE_LINK_NOT_FOUND"}""", closedBody)
        assertEquals(missingBody, closedBody)

        getPublic(swapCase(exercise.token), 404)
    }

    @Test
    fun `친구 화면은 회차를 만들지 않는다`() {
        val username = "pubnogen"
        val cookie = signup(username, "10.0.4.2")
        val account = checkNotNull(accountRepository.findByUsername(username))
        val walkId = createRoutine(cookie, "산책")
        val link = createLink(cookie, "운동", "[$walkId]", false)

        val body = getPublic(link.token, 200)
        assertEquals(emptyList(), taskNames(body))
        val tasks =
            taskRepository.findInRangeWithRoutine(
                account.id,
                LocalDate.of(2026, 11, 2),
                LocalDate.of(2026, 11, 8),
                TaskStatus.DELETED,
            )
        assertTrue(tasks.isEmpty())
    }

    private data class CreatedLink(
        val id: Long,
        val token: String,
    )

    private fun createRoutine(
        cookie: Cookie,
        name: String,
    ): Long {
        val body =
            mockMvc
                .post("/api/routines") {
                    cookie(cookie)
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"$name","energyCost":2,"timeSlot":"MORNING","weekdays":127,"startDate":"2026-11-04"}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
        return JsonPath.read<Number>(body, "$.routineId").toLong()
    }

    private fun createTask(
        cookie: Cookie,
        name: String,
        date: String,
        isVisible: Boolean,
    ) {
        mockMvc
            .post("/api/tasks") {
                cookie(cookie)
                contentType = MediaType.APPLICATION_JSON
                content = """{"name":"$name","plannedDate":"$date","timeSlot":"EVENING","energyCost":3,"isVisible":$isVisible}"""
            }.andExpect { status { isCreated() } }
    }

    private fun createLink(
        cookie: Cookie,
        name: String,
        routineIds: String,
        isOneTimeVisible: Boolean,
    ): CreatedLink {
        val body =
            mockMvc
                .post("/api/share-links") {
                    cookie(cookie)
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"$name","routineIds":$routineIds,"isOneTimeVisible":$isOneTimeVisible,"expiry":"NONE"}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
        return CreatedLink(
            JsonPath.read<Number>(body, "$.shareLinkId").toLong(),
            JsonPath.read(body, "$.token"),
        )
    }

    private fun getPublic(
        token: String,
        expectedStatus: Int,
    ): String {
        val result = mockMvc.get("/api/public/share/$token").andReturn()
        assertEquals(expectedStatus, result.response.status, result.response.contentAsString)
        return result.response.getContentAsString(Charsets.UTF_8)
    }

    private fun taskNames(body: String): List<String> = JsonPath.read(body, "$.days[*].tasks[*].name")

    private fun swapCase(token: String): String {
        val i = token.indexOfFirst { it.isLetter() }
        val c = token[i]
        val swapped = if (c.isUpperCase()) c.lowercaseChar() else c.uppercaseChar()
        return token.substring(0, i) + swapped + token.substring(i + 1)
    }
}
