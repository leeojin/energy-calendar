package com.energycal.share.service

import com.energycal.calc.EnergyCalc
import com.energycal.common.BusinessException
import com.energycal.common.ErrorCode
import com.energycal.common.RateLimiter
import com.energycal.share.dto.PublicCommentResponse
import com.energycal.share.dto.ShareLinkCommentCreateRequest
import com.energycal.share.dto.ShareLinkCommentResponse
import com.energycal.share.dto.toPublicResponse
import com.energycal.share.dto.toResponse
import com.energycal.share.entity.ShareLinkComment
import com.energycal.share.entity.ShareLinkStatus
import com.energycal.share.repository.ShareLinkCommentRepository
import com.energycal.share.repository.ShareLinkRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

@Service
class ShareLinkCommentService(
    private val shareLinkRepository: ShareLinkRepository,
    private val shareLinkCommentRepository: ShareLinkCommentRepository,
    private val rateLimiter: RateLimiter,
    private val clock: Clock,
    @param:Value("\${app.limits.comment-per-ip-per-minute}") private val perIpPerMinute: Int,
    @param:Value("\${app.limits.comment-per-link-per-day}") private val perLinkPerDay: Int,
) {
    @Transactional
    fun createPublicComment(
        token: String,
        ip: String,
        request: ShareLinkCommentCreateRequest,
    ): PublicCommentResponse {
        val today = EnergyCalc.today(clock)
        val link = shareLinkRepository.findByToken(token)
        if (link == null || !EnergyCalc.isLinkOpen(link.status, link.expireDate, today)) {
            throw BusinessException(ErrorCode.SHARE_LINK_NOT_FOUND)
        }
        if (!rateLimiter.tryAcquire("comment-ip", ip, perIpPerMinute, RateLimiter.Window.PER_MINUTE)) {
            throw BusinessException(ErrorCode.COMMENT_RATE_LIMITED)
        }
        if (!rateLimiter.tryAcquire("comment-link", link.id.toString(), perLinkPerDay, RateLimiter.Window.PER_DAY_KST)) {
            throw BusinessException(ErrorCode.COMMENT_DAILY_LIMIT)
        }
        val comment =
            shareLinkCommentRepository.save(
                ShareLinkComment(
                    shareLink = link,
                    nickname = request.nickname!!.trim(),
                    body = request.body!!.trim(),
                    createdAt = LocalDateTime.now(clock),
                ),
            )
        return comment.toPublicResponse()
    }

    @Transactional(readOnly = true)
    fun getComments(
        accountId: Long,
        shareLinkId: Long,
    ): List<ShareLinkCommentResponse> {
        val link =
            shareLinkRepository.findByIdAndAccountIdAndStatusNot(shareLinkId, accountId, ShareLinkStatus.DELETED)
                ?: throw BusinessException(ErrorCode.SHARE_LINK_NOT_FOUND)
        return shareLinkCommentRepository
            .findAllByShareLinkIdOrderByCreatedAtDescIdDesc(link.id)
            .map { it.toResponse() }
    }

    @Transactional
    fun deleteComment(
        accountId: Long,
        commentId: Long,
    ) {
        val comment =
            shareLinkCommentRepository.findOwned(commentId, accountId)
                ?: throw BusinessException(ErrorCode.COMMENT_NOT_FOUND)
        shareLinkCommentRepository.delete(comment)
    }
}
