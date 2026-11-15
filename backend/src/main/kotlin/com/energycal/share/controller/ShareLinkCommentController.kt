package com.energycal.share.controller

import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.resolver.LoginUser
import com.energycal.share.dto.ShareLinkCommentResponse
import com.energycal.share.service.ShareLinkCommentService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
class ShareLinkCommentController(
    private val shareLinkCommentService: ShareLinkCommentService,
) {
    @GetMapping("/api/share-links/{shareLinkId}/comments")
    fun getComments(
        @LoginUser login: LoginAccount,
        @PathVariable shareLinkId: Long,
    ): List<ShareLinkCommentResponse> = shareLinkCommentService.getComments(login.accountId, shareLinkId)

    @DeleteMapping("/api/share-link-comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteComment(
        @LoginUser login: LoginAccount,
        @PathVariable commentId: Long,
    ) = shareLinkCommentService.deleteComment(login.accountId, commentId)
}
