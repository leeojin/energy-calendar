package com.energycal.account.controller

import com.energycal.account.dto.AccountBudgetUpdateRequest
import com.energycal.account.dto.AccountDeleteRequest
import com.energycal.account.dto.AccountDeleteSummaryResponse
import com.energycal.account.dto.AccountNicknameUpdateRequest
import com.energycal.account.dto.AccountPasswordUpdateRequest
import com.energycal.account.dto.AccountReauthRequest
import com.energycal.account.dto.MeResponse
import com.energycal.account.service.AccountDeleteService
import com.energycal.account.service.MeService
import com.energycal.auth.controller.AuthCookie
import com.energycal.auth.dto.LoginAccount
import com.energycal.auth.resolver.LoginUser
import com.energycal.common.ClientIp
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/me")
class MeController(
    private val meService: MeService,
    private val accountDeleteService: AccountDeleteService,
    private val authCookie: AuthCookie,
) {
    @GetMapping
    fun getMe(
        @LoginUser login: LoginAccount,
    ): MeResponse = meService.getMe(login)

    @PatchMapping("/energy-budget")
    fun updateEnergyBudget(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: AccountBudgetUpdateRequest,
    ): MeResponse = meService.updateEnergyBudget(login, request.energyBudget!!)

    @PatchMapping("/nickname")
    fun updateNickname(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: AccountNicknameUpdateRequest,
    ): MeResponse = meService.updateNickname(login, request.nickname!!)

    @PatchMapping("/password")
    fun updatePassword(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: AccountPasswordUpdateRequest,
        servletRequest: HttpServletRequest,
    ): ResponseEntity<Void> {
        val token =
            meService.updatePassword(
                login,
                request.currentPassword!!,
                request.newPassword!!,
                ClientIp.of(servletRequest),
            )
        return ResponseEntity
            .noContent()
            .header(HttpHeaders.SET_COOKIE, authCookie.issue(token).toString())
            .build()
    }

    @PostMapping("/reauth")
    fun reauth(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: AccountReauthRequest,
        servletRequest: HttpServletRequest,
    ): ResponseEntity<MeResponse> {
        val result =
            meService.reauth(
                login,
                request.username!!,
                request.password!!,
                ClientIp.of(servletRequest),
            )
        return ResponseEntity
            .ok()
            .header(HttpHeaders.SET_COOKIE, authCookie.issue(result.token).toString())
            .body(result.me)
    }

    @GetMapping("/delete-summary")
    fun deleteSummary(
        @LoginUser login: LoginAccount,
    ): AccountDeleteSummaryResponse = accountDeleteService.summary(login)

    @DeleteMapping
    fun deleteMe(
        @LoginUser login: LoginAccount,
        @Valid @RequestBody request: AccountDeleteRequest,
        servletRequest: HttpServletRequest,
    ): ResponseEntity<Void> {
        accountDeleteService.delete(login, request.username!!, request.password!!, ClientIp.of(servletRequest))
        return ResponseEntity
            .noContent()
            .header(HttpHeaders.SET_COOKIE, authCookie.clear().toString())
            .build()
    }
}
