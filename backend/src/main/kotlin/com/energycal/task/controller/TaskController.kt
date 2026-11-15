package com.energycal.task.controller

import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.resolver.LoginUser
import com.energycal.task.dto.TaskCreateRequest
import com.energycal.task.dto.TaskMoveHistoryResponse
import com.energycal.task.dto.TaskMoveRequest
import com.energycal.task.dto.TaskResponse
import com.energycal.task.dto.TaskUpdateRequest
import com.energycal.task.service.TaskService
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
class TaskController(
    private val taskService: TaskService,
) {
    @PostMapping("/api/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    fun createTask(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: TaskCreateRequest,
    ): TaskResponse = taskService.createTask(login.accountId, request)

    @PatchMapping("/api/tasks/{taskId}")
    fun updateTask(
        @LoginUser login: LoginAccount,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: TaskUpdateRequest,
    ): TaskResponse = taskService.updateTask(login.accountId, taskId, request)

    @DeleteMapping("/api/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTask(
        @LoginUser login: LoginAccount,
        @PathVariable taskId: Long,
    ) = taskService.deleteTask(login.accountId, taskId)

    @PostMapping("/api/tasks/{taskId}/complete")
    fun completeTask(
        @LoginUser login: LoginAccount,
        @PathVariable taskId: Long,
    ): TaskResponse = taskService.completeTask(login.accountId, taskId)

    @PostMapping("/api/tasks/{taskId}/uncomplete")
    fun uncompleteTask(
        @LoginUser login: LoginAccount,
        @PathVariable taskId: Long,
    ): TaskResponse = taskService.uncompleteTask(login.accountId, taskId)

    @PostMapping("/api/tasks/{taskId}/move")
    fun moveTask(
        @LoginUser login: LoginAccount,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: TaskMoveRequest,
    ): TaskResponse = taskService.moveTask(login.accountId, taskId, request)

    @GetMapping("/api/tasks/{taskId}/moves")
    fun getTaskMoves(
        @LoginUser login: LoginAccount,
        @PathVariable taskId: Long,
    ): List<TaskMoveHistoryResponse> = taskService.getTaskMoves(login.accountId, taskId)

    @GetMapping("/api/moves")
    fun getMovesOfWeek(
        @LoginUser login: LoginAccount,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) week: LocalDate,
    ): List<TaskMoveHistoryResponse> = taskService.getMovesOfWeek(login.accountId, week)
}
