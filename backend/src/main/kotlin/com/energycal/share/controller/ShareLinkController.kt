package com.energycal.share.controller

import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.resolver.LoginUser
import com.energycal.share.dto.ShareLinkCreateRequest
import com.energycal.share.dto.ShareLinkResponse
import com.energycal.share.dto.ShareLinkUpdateRequest
import com.energycal.share.service.ShareLinkService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/share-links")
class ShareLinkController(
    private val shareLinkService: ShareLinkService,
) {
    @GetMapping
    fun getShareLinks(
        @LoginUser login: LoginAccount,
    ): List<ShareLinkResponse> = shareLinkService.getShareLinks(login.accountId)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createShareLink(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: ShareLinkCreateRequest,
    ): ShareLinkResponse = shareLinkService.createShareLink(login.accountId, request)

    @PatchMapping("/{shareLinkId}")
    fun updateShareLink(
        @LoginUser login: LoginAccount,
        @PathVariable shareLinkId: Long,
        @Valid @RequestBody request: ShareLinkUpdateRequest,
    ): ShareLinkResponse = shareLinkService.updateShareLink(login.accountId, shareLinkId, request)

    @PostMapping("/{shareLinkId}/close")
    fun closeShareLink(
        @LoginUser login: LoginAccount,
        @PathVariable shareLinkId: Long,
    ): ShareLinkResponse = shareLinkService.closeShareLink(login.accountId, shareLinkId)

    @DeleteMapping("/{shareLinkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteShareLink(
        @LoginUser login: LoginAccount,
        @PathVariable shareLinkId: Long,
    ) = shareLinkService.deleteShareLink(login.accountId, shareLinkId)

    @DeleteMapping("/{shareLinkId}/with-comments")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteShareLinkWithComments(
        @LoginUser login: LoginAccount,
        @PathVariable shareLinkId: Long,
    ) = shareLinkService.deleteShareLinkWithComments(login.accountId, shareLinkId)

    @PutMapping("/{shareLinkId}/routines/{routineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun addRoutine(
        @LoginUser login: LoginAccount,
        @PathVariable shareLinkId: Long,
        @PathVariable routineId: Long,
    ) = shareLinkService.addRoutine(login.accountId, shareLinkId, routineId)

    @DeleteMapping("/{shareLinkId}/routines/{routineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun removeRoutine(
        @LoginUser login: LoginAccount,
        @PathVariable shareLinkId: Long,
        @PathVariable routineId: Long,
    ) = shareLinkService.removeRoutine(login.accountId, shareLinkId, routineId)
}
