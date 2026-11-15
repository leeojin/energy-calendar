package com.energycal.auth.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import java.time.Duration

@Component
class CloudflareTurnstileVerifier(
    @param:Value("\${app.turnstile.secret-key}") private val secretKey: String,
    @param:Value("\${app.turnstile.verify-url}") private val verifyUrl: String,
) : TurnstileVerifier {
    private val log = LoggerFactory.getLogger(javaClass)

    private val restClient: RestClient =
        RestClient
            .builder()
            .requestFactory(
                SimpleClientHttpRequestFactory().apply {
                    setConnectTimeout(TIMEOUT)
                    setReadTimeout(TIMEOUT)
                },
            ).build()

    override fun verify(
        token: String,
        remoteIp: String,
    ): Boolean {
        val form =
            LinkedMultiValueMap<String, String>().apply {
                add("secret", secretKey)
                add("response", token)
                add("remoteip", remoteIp)
            }
        return try {
            val result =
                restClient
                    .post()
                    .uri(verifyUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(SiteverifyResult::class.java)
            result?.success == true
        } catch (e: Exception) {
            log.warn("Turnstile 확인 요청 실패: {}", e.javaClass.simpleName)
            false
        }
    }

    data class SiteverifyResult(
        val success: Boolean? = null,
    )

    companion object {
        private val TIMEOUT: Duration = Duration.ofSeconds(5)
    }
}
