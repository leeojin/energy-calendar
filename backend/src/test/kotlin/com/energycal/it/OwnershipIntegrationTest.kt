package com.energycal.it

import com.energycal.routine.entity.RoutineStatus
import com.energycal.routine.repository.RoutineRepository
import com.energycal.share.entity.ShareLinkStatus
import com.energycal.share.repository.ShareLinkRepository
import com.energycal.share.repository.ShareLinkRoutineRepository
import com.energycal.task.entity.TaskStatus
import com.energycal.task.entity.TimeSlot
import com.energycal.task.repository.TaskMoveHistoryRepository
import com.energycal.task.repository.TaskRepository
import com.jayway.jsonpath.JsonPath
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertNull

class OwnershipIntegrationTest : IntegrationTestSupport() {
    @Autowired
    private lateinit var taskRepository: TaskRepository

    @Autowired
    private lateinit var taskMoveHistoryRepository: TaskMoveHistoryRepository

    @Autowired
    private lateinit var routineRepository: RoutineRepository

    @Autowired
    private lateinit var shareLinkRepository: ShareLinkRepository

    @Autowired
    private lateinit var shareLinkRoutineRepository: ShareLinkRoutineRepository

    @Test
    fun `남의 할 일을 고치고 지우고 했어요 옮기기 옮긴 기록을 하면 모두 404이고 그대로다`() {
        val ownerCookie = signup("ownertask", "10.0.0.1")
        val otherCookie = signup("othertask", "10.0.0.2")
        val taskId = createTask(ownerCookie, "병원", "2026-11-04", "MORNING", 4)

        mockMvc
            .patch("/api/tasks/$taskId") {
                cookie(otherCookie)
                contentType = MediaType.APPLICATION_JSON
                content = """{"name":"남","energyCost":9,"isVisible":true}"""
            }.expectTaskNotFound()
        mockMvc.delete("/api/tasks/$taskId") { cookie(otherCookie) }.expectTaskNotFound()
        mockMvc.post("/api/tasks/$taskId/complete") { cookie(otherCookie) }.expectTaskNotFound()
        mockMvc.post("/api/tasks/$taskId/uncomplete") { cookie(otherCookie) }.expectTaskNotFound()
        mockMvc
            .post("/api/tasks/$taskId/move") {
                cookie(otherCookie)
                contentType = MediaType.APPLICATION_JSON
                content = """{"toDate":"2026-11-05","toTimeSlot":"EVENING"}"""
            }.expectTaskNotFound()
        mockMvc.get("/api/tasks/$taskId/moves") { cookie(otherCookie) }.expectTaskNotFound()

        val task = taskRepository.findById(taskId).orElseThrow()
        assertEquals("병원", task.name)
        assertEquals(4, task.energyCost)
        assertEquals(false, task.isVisible)
        assertEquals(TaskStatus.PLANNED, task.status)
        assertNull(task.completedAt)
        assertEquals(LocalDate.of(2026, 11, 4), task.plannedDate)
        assertEquals(TimeSlot.MORNING, task.timeSlot)
        assertEquals(0L, taskMoveHistoryRepository.countByTaskId(taskId))

        mockMvc.get("/api/tasks/$taskId/moves") { cookie(ownerCookie) }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(0) }
        }
    }

    @Test
    fun `없는 할 일과 남의 할 일은 같은 본문이다`() {
        val ownerCookie = signup("ownersame", "10.0.0.3")
        val otherCookie = signup("othersame", "10.0.0.4")
        val taskId = createTask(ownerCookie, "산책", "2026-11-05", "EVENING", 2)

        val otherBody =
            mockMvc
                .post("/api/tasks/$taskId/complete") { cookie(otherCookie) }
                .andReturn()
                .response.contentAsString
        val missingBody =
            mockMvc
                .post("/api/tasks/99999999/complete") { cookie(otherCookie) }
                .andReturn()
                .response.contentAsString
        assertEquals(missingBody, otherBody)
    }

    @Test
    fun `남의 매주 하는 일 이름 바꾸기와 그만하기는 404이고 그대로다`() {
        val ownerCookie = signup("ownerroutine", "10.0.0.5")
        val otherCookie = signup("otherroutine", "10.0.0.6")
        val body =
            mockMvc
                .post("/api/routines") {
                    cookie(ownerCookie)
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"산책","energyCost":2,"timeSlot":"MORNING","weekdays":21,"startDate":"2026-11-04"}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
        val routineId = JsonPath.read<Number>(body, "$.routineId").toLong()

        mockMvc
            .patch("/api/routines/$routineId/name") {
                cookie(otherCookie)
                contentType = MediaType.APPLICATION_JSON
                content = """{"name":"남"}"""
            }.expectNotFound("ROUTINE_NOT_FOUND")
        mockMvc.post("/api/routines/$routineId/end") { cookie(otherCookie) }.expectNotFound("ROUTINE_NOT_FOUND")
        mockMvc.get("/api/routines") { cookie(otherCookie) }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(0) }
        }

        val routine = routineRepository.findById(routineId).orElseThrow()
        assertEquals("산책", routine.name)
        assertEquals(RoutineStatus.ACTIVE, routine.status)
        assertNull(routine.endDate)
    }

    @Test
    fun `남의 공유 링크를 닫고 바꾸고 지우고 매주 하는 일을 넣으면 모두 404이고 그대로다`() {
        val ownerCookie = signup("ownerlink", "10.0.0.7")
        val otherCookie = signup("otherlink", "10.0.0.8")
        val ownerRoutineId = createRoutine(ownerCookie, "산책")
        val otherRoutineId = createRoutine(otherCookie, "약 먹기")
        val ownerLinkId = createShareLink(ownerCookie, "운동", "[$ownerRoutineId]")
        val otherLinkId = createShareLink(otherCookie, "가족", "[]")

        mockMvc.post("/api/share-links/$ownerLinkId/close") { cookie(otherCookie) }.expectNotFound("SHARE_LINK_NOT_FOUND")
        mockMvc
            .patch("/api/share-links/$ownerLinkId") {
                cookie(otherCookie)
                contentType = MediaType.APPLICATION_JSON
                content = """{"isOneTimeVisible":true,"expiry":"THIS_WEEK"}"""
            }.expectNotFound("SHARE_LINK_NOT_FOUND")
        mockMvc.delete("/api/share-links/$ownerLinkId") { cookie(otherCookie) }.expectNotFound("SHARE_LINK_NOT_FOUND")
        mockMvc
            .delete("/api/share-links/$ownerLinkId/with-comments") { cookie(otherCookie) }
            .expectNotFound("SHARE_LINK_NOT_FOUND")
        mockMvc
            .delete("/api/share-links/$ownerLinkId/routines/$ownerRoutineId") { cookie(otherCookie) }
            .expectNotFound("SHARE_LINK_NOT_FOUND")
        mockMvc
            .put("/api/share-links/$ownerLinkId/routines/$otherRoutineId") { cookie(otherCookie) }
            .expectNotFound("SHARE_LINK_NOT_FOUND")
        mockMvc
            .put("/api/share-links/$otherLinkId/routines/$ownerRoutineId") { cookie(otherCookie) }
            .expectNotFound("ROUTINE_NOT_FOUND")
        mockMvc
            .post("/api/share-links") {
                cookie(otherCookie)
                contentType = MediaType.APPLICATION_JSON
                content = """{"name":"몰래","routineIds":[$ownerRoutineId]}"""
            }.expectNotFound("ROUTINE_NOT_FOUND")
        mockMvc.get("/api/share-links") { cookie(otherCookie) }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].routineIds.length()") { value(0) }
        }

        val link = shareLinkRepository.findById(ownerLinkId).orElseThrow()
        assertEquals(ShareLinkStatus.OPEN, link.status)
        assertEquals(false, link.isOneTimeVisible)
        assertNull(link.expireDate)
        assertNull(link.closedAt)
        assertEquals(1L, shareLinkRoutineRepository.countByShareLinkId(ownerLinkId))
        assertEquals(0L, shareLinkRoutineRepository.countByShareLinkId(otherLinkId))
    }

    @Test
    fun `남의 응원을 지우고 남의 링크 응원 목록을 보면 404이고 응원은 그대로다`() {
        val ownerCookie = signup("ownercheer", "10.0.0.9")
        val otherCookie = signup("othercheer", "10.0.0.10")
        val linkId = createShareLink(ownerCookie, "운동", "[]")
        val token =
            JsonPath.read<String>(
                mockMvc
                    .get("/api/share-links") { cookie(ownerCookie) }
                    .andReturn()
                    .response.contentAsString,
                "$[0].token",
            )
        mockMvc
            .post("/api/public/share/$token/comments") {
                contentType = MediaType.APPLICATION_JSON
                content = """{"nickname":"수달","body":"화이팅"}"""
                with {
                    it.remoteAddr = "10.0.0.11"
                    it
                }
            }.andExpect { status { isCreated() } }
        val commentId =
            JsonPath
                .read<Number>(
                    mockMvc
                        .get("/api/share-links/$linkId/comments") { cookie(ownerCookie) }
                        .andExpect { status { isOk() } }
                        .andReturn()
                        .response.contentAsString,
                    "$[0].shareLinkCommentId",
                ).toLong()

        mockMvc.delete("/api/share-link-comments/$commentId") { cookie(otherCookie) }.expectNotFound("COMMENT_NOT_FOUND")
        mockMvc.get("/api/share-links/$linkId/comments") { cookie(otherCookie) }.expectNotFound("SHARE_LINK_NOT_FOUND")

        mockMvc.get("/api/share-links/$linkId/comments") { cookie(ownerCookie) }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
        }
    }

    private fun createRoutine(
        cookie: Cookie,
        name: String,
    ): Long {
        val body =
            mockMvc
                .post("/api/routines") {
                    cookie(cookie)
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"$name","energyCost":2,"timeSlot":"MORNING","weekdays":21,"startDate":"2026-11-04"}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
        return JsonPath.read<Number>(body, "$.routineId").toLong()
    }

    private fun createShareLink(
        cookie: Cookie,
        name: String,
        routineIds: String,
    ): Long {
        val body =
            mockMvc
                .post("/api/share-links") {
                    cookie(cookie)
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"$name","routineIds":$routineIds,"isOneTimeVisible":false,"expiry":"NONE"}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
        return JsonPath.read<Number>(body, "$.shareLinkId").toLong()
    }

    private fun createTask(
        cookie: Cookie,
        name: String,
        date: String,
        slot: String,
        cost: Int,
    ): Long {
        val body =
            mockMvc
                .post("/api/tasks") {
                    cookie(cookie)
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"$name","plannedDate":"$date","timeSlot":"$slot","energyCost":$cost}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
        return JsonPath.read<Number>(body, "$.taskId").toLong()
    }

    private fun ResultActionsDsl.expectTaskNotFound() = expectNotFound("TASK_NOT_FOUND")

    private fun ResultActionsDsl.expectNotFound(code: String) {
        andExpect {
            status { isNotFound() }
            jsonPath("$.code") { value(code) }
        }
    }
}
