package com.energycal.share.controller

import com.energycal.common.ClientIp
import com.energycal.share.dto.PublicCommentResponse
import com.energycal.share.dto.PublicShareResponse
import com.energycal.share.dto.ShareLinkCommentCreateRequest
import com.energycal.share.service.PublicShareService
import com.energycal.share.service.ShareLinkCommentService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/public/share")
class PublicShareController(
    private val publicShareService: PublicShareService,
    private val shareLinkCommentService: ShareLinkCommentService,
) {
    @GetMapping("/{token}")
    fun getPublicShare(
        @PathVariable token: String,
    ): PublicShareResponse = publicShareService.getPublicShare(token)

    @PostMapping("/{token}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    fun createComment(
        @PathVariable token: String,
        @Valid @RequestBody request: ShareLinkCommentCreateRequest,
        servletRequest: HttpServletRequest,
    ): PublicCommentResponse = shareLinkCommentService.createPublicComment(token, ClientIp.of(servletRequest), request)
}
