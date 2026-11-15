package com.energycal.share.service

import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.share.dto.PublicDayResponse
import com.energycal.share.dto.PublicShareResponse
import com.energycal.share.dto.PublicTaskResponse
import com.energycal.share.dto.toPublicResponse
import com.energycal.share.repository.ShareLinkCommentRepository
import com.energycal.share.repository.ShareLinkRepository
import com.energycal.share.repository.ShareLinkRoutineRepository
import com.energycal.task.entity.TaskStatus
import com.energycal.task.repository.TaskRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

@Service
class PublicShareService(
    private val shareLinkRepository: ShareLinkRepository,
    private val shareLinkRoutineRepository: ShareLinkRoutineRepository,
    private val shareLinkCommentRepository: ShareLinkCommentRepository,
    private val taskRepository: TaskRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getPublicShare(token: String): PublicShareResponse {
        val today = EnergyCalc.today(clock)
        val link = shareLinkRepository.findByToken(token)
        if (link == null || !EnergyCalc.isLinkOpen(link.status, link.expireDate, today)) {
            throw BusinessException(ErrorCode.SHARE_LINK_NOT_FOUND)
        }
        val routineIds =
            shareLinkRoutineRepository
                .findPairsByShareLinkIds(listOf(link.id))
                .map { it.routineId }
                .toSet()
        val visibilityLink =
            EnergyCalc.VisibilityLink(
                status = link.status,
                expireDate = link.expireDate,
                isOneTimeVisible = link.isOneTimeVisible,
                routineIds = routineIds,
            )
        val weekStart = EnergyCalc.weekStart(today)
        val weekDates = EnergyCalc.weekDates(weekStart)
        val weekEnd = weekDates.last()
        val visibleTasks =
            taskRepository
                .findInRangeWithRoutine(link.accountId, weekStart, weekEnd, TaskStatus.DELETED)
                .filter {
                    EnergyCalc.isVisibleOnLink(
                        EnergyCalc.VisibilityTask(
                            routineId = it.routine?.id,
                            status = it.status,
                            plannedDate = it.plannedDate,
                            isVisible = it.isVisible,
                        ),
                        visibilityLink,
                        today,
                    )
                }.sortedBy { it.id }
        val tasksByDate = visibleTasks.groupBy { it.plannedDate }
        val days =
            weekDates.map { date ->
                PublicDayResponse(
                    date = date,
                    tasks =
                        tasksByDate[date].orEmpty().map {
                            PublicTaskResponse(
                                name = it.routine?.name ?: it.name.orEmpty(),
                                status = EnergyCalc.publicStatus(it.status, it.plannedDate, today),
                            )
                        },
                )
            }
        val (from, to) = EnergyCalc.weekRange(weekStart)
        val comments =
            shareLinkCommentRepository
                .findAllInRange(link.id, from, to)
                .map { it.toPublicResponse() }
        return PublicShareResponse(
            name = link.name,
            weekStart = weekStart,
            weekEnd = weekEnd,
            today = today,
            expireDate = link.expireDate,
            days = days,
            comments = comments,
        )
    }
}
