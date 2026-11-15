package com.energycal.share.service

import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.common.RateLimiter
import com.energycal.routine.repository.RoutineRepository
import com.energycal.share.dto.LinkExpiry
import com.energycal.share.dto.ShareLinkCreateRequest
import com.energycal.share.dto.ShareLinkResponse
import com.energycal.share.dto.ShareLinkUpdateRequest
import com.energycal.share.dto.toResponse
import com.energycal.share.entity.ShareLink
import com.energycal.share.entity.ShareLinkRoutine
import com.energycal.share.entity.ShareLinkStatus
import com.energycal.share.repository.ShareLinkCommentRepository
import com.energycal.share.repository.ShareLinkRepository
import com.energycal.share.repository.ShareLinkRoutineRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime

@Service
class ShareLinkService(
    private val shareLinkRepository: ShareLinkRepository,
    private val shareLinkRoutineRepository: ShareLinkRoutineRepository,
    private val shareLinkCommentRepository: ShareLinkCommentRepository,
    private val routineRepository: RoutineRepository,
    private val shareTokenGenerator: ShareTokenGenerator,
    private val rateLimiter: RateLimiter,
    private val clock: Clock,
    @param:Value("\${app.limits.share-link-open-max}") private val openMax: Int,
    @param:Value("\${app.limits.share-link-total-max}") private val totalMax: Int,
    @param:Value("\${app.limits.share-link-create-per-day}") private val createPerDay: Int,
) {
    @Transactional(readOnly = true)
    fun getShareLinks(accountId: Long): List<ShareLinkResponse> {
        val links = shareLinkRepository.findAllByAccountIdAndStatusNotOrderByIdAsc(accountId, ShareLinkStatus.DELETED)
        return toResponses(links, EnergyCalc.today(clock))
    }

    @Transactional
    fun createShareLink(
        accountId: Long,
        request: ShareLinkCreateRequest,
    ): ShareLinkResponse {
        val today = EnergyCalc.today(clock)
        val routines =
            request.routineIds.orEmpty().distinct().map { routineId ->
                routineRepository.findByIdAndAccountId(routineId, accountId)
                    ?: throw BusinessException(ErrorCode.ROUTINE_NOT_FOUND)
            }
        if (shareLinkRepository.countOpen(accountId, ShareLinkStatus.OPEN, today) >= openMax) {
            throw BusinessException(ErrorCode.SHARE_LINK_OPEN_LIMIT)
        }
        if (shareLinkRepository.countByAccountIdAndStatusNot(accountId, ShareLinkStatus.DELETED) >= totalMax) {
            throw BusinessException(ErrorCode.SHARE_LINK_TOTAL_LIMIT)
        }
        if (!rateLimiter.tryAcquire("share-create", accountId.toString(), createPerDay, RateLimiter.Window.PER_DAY_KST)) {
            throw BusinessException(ErrorCode.SHARE_LINK_CREATE_DAILY_LIMIT)
        }
        val now = LocalDateTime.now(clock)
        val link =
            shareLinkRepository.save(
                ShareLink(
                    accountId = accountId,
                    token = shareTokenGenerator.newToken(),
                    name = request.name!!.trim(),
                    isOneTimeVisible = request.isOneTimeVisible ?: false,
                    expireDate = EnergyCalc.expireDateFor(request.expiry ?: LinkExpiry.NONE, today),
                    createdAt = now,
                    updatedAt = now,
                ),
            )
        routines.forEach { shareLinkRoutineRepository.save(ShareLinkRoutine(shareLink = link, routine = it, createdAt = now)) }
        return link.toResponse(today, routines.map { it.id }, 0)
    }

    @Transactional
    fun updateShareLink(
        accountId: Long,
        shareLinkId: Long,
        request: ShareLinkUpdateRequest,
    ): ShareLinkResponse {
        if (request.isOneTimeVisible == null && request.expiry == null) {
            throw BusinessException(ErrorCode.VALIDATION_FAILED)
        }
        val today = EnergyCalc.today(clock)
        val link = findOpenMine(accountId, shareLinkId, today)
        request.isOneTimeVisible?.let { link.isOneTimeVisible = it }
        request.expiry?.let { link.expireDate = EnergyCalc.expireDateFor(it, today) }
        link.updatedAt = LocalDateTime.now(clock)
        return toResponses(listOf(link), today).single()
    }

    @Transactional
    fun closeShareLink(
        accountId: Long,
        shareLinkId: Long,
    ): ShareLinkResponse {
        val today = EnergyCalc.today(clock)
        val link = findMine(accountId, shareLinkId)
        if (link.status != ShareLinkStatus.OPEN) {
            throw BusinessException(ErrorCode.SHARE_LINK_NOT_OPEN)
        }
        val now = LocalDateTime.now(clock)
        link.status = ShareLinkStatus.CLOSED
        link.closedAt = now
        link.updatedAt = now
        return toResponses(listOf(link), today).single()
    }

    @Transactional
    fun deleteShareLink(
        accountId: Long,
        shareLinkId: Long,
    ) {
        val link = findNotOpenMine(accountId, shareLinkId)
        val now = LocalDateTime.now(clock)
        link.status = ShareLinkStatus.DELETED
        link.closedAt = link.closedAt ?: now
        link.updatedAt = now
        shareLinkRoutineRepository.deleteAllByShareLinkId(link.id)
    }

    @Transactional
    fun deleteShareLinkWithComments(
        accountId: Long,
        shareLinkId: Long,
    ) {
        val link = findNotOpenMine(accountId, shareLinkId)
        shareLinkCommentRepository.deleteAllByShareLinkId(link.id)
        shareLinkRoutineRepository.deleteAllByShareLinkId(link.id)
        shareLinkRepository.delete(link)
    }

    // 유니크 충돌은 저장 트랜잭션 밖에서 처리
    fun addRoutine(
        accountId: Long,
        shareLinkId: Long,
        routineId: Long,
    ) {
        val today = EnergyCalc.today(clock)
        val link = findOpenMine(accountId, shareLinkId, today)
        val routine =
            routineRepository.findByIdAndAccountId(routineId, accountId)
                ?: throw BusinessException(ErrorCode.ROUTINE_NOT_FOUND)
        if (shareLinkRoutineRepository.existsByShareLinkIdAndRoutineId(link.id, routine.id)) {
            return
        }
        try {
            shareLinkRoutineRepository.saveAndFlush(
                ShareLinkRoutine(shareLink = link, routine = routine, createdAt = LocalDateTime.now(clock)),
            )
        } catch (_: DataIntegrityViolationException) {
        }
    }

    @Transactional
    fun removeRoutine(
        accountId: Long,
        shareLinkId: Long,
        routineId: Long,
    ) {
        val link = findOpenMine(accountId, shareLinkId, EnergyCalc.today(clock))
        shareLinkRoutineRepository.deleteByShareLinkIdAndRoutineId(link.id, routineId)
    }

    private fun findMine(
        accountId: Long,
        shareLinkId: Long,
    ): ShareLink =
        shareLinkRepository.findByIdAndAccountIdAndStatusNot(shareLinkId, accountId, ShareLinkStatus.DELETED)
            ?: throw BusinessException(ErrorCode.SHARE_LINK_NOT_FOUND)

    private fun findOpenMine(
        accountId: Long,
        shareLinkId: Long,
        today: LocalDate,
    ): ShareLink {
        val link = findMine(accountId, shareLinkId)
        if (!EnergyCalc.isLinkOpen(link.status, link.expireDate, today)) {
            throw BusinessException(ErrorCode.SHARE_LINK_NOT_OPEN)
        }
        return link
    }

    private fun findNotOpenMine(
        accountId: Long,
        shareLinkId: Long,
    ): ShareLink {
        val link = findMine(accountId, shareLinkId)
        if (EnergyCalc.isLinkOpen(link.status, link.expireDate, EnergyCalc.today(clock))) {
            throw BusinessException(ErrorCode.SHARE_LINK_STILL_OPEN)
        }
        return link
    }

    private fun toResponses(
        links: List<ShareLink>,
        today: LocalDate,
    ): List<ShareLinkResponse> {
        if (links.isEmpty()) return emptyList()
        val ids = links.map { it.id }
        val routineIdsByLink =
            shareLinkRoutineRepository
                .findPairsByShareLinkIds(ids)
                .groupBy({ it.shareLinkId }, { it.routineId })
        val commentCountByLink =
            shareLinkCommentRepository
                .countByShareLinkIds(ids)
                .associate { it.shareLinkId to it.commentCount }
        return links.map { link ->
            link.toResponse(
                today = today,
                routineIds = routineIdsByLink[link.id].orEmpty(),
                commentCount = commentCountByLink[link.id] ?: 0,
            )
        }
    }
}
