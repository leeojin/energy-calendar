package com.energycal.common

import jakarta.validation.Validation
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PasswordValidatorTest {
    private val validator = Validation.buildDefaultValidatorFactory().validator

    private class Form(
        @field:Password
        val password: String?,
    )

    private fun valid(value: String?) = validator.validate(Form(value)).isEmpty()

    @Test
    fun `글자 수는 8에서 16까지다`() {
        assertFalse(valid("Aa1!" + "a".repeat(3)))
        assertTrue(valid("Aa1!" + "a".repeat(4)))
        assertTrue(valid("Aa1!" + "a".repeat(12)))
        assertFalse(valid("Aa1!" + "a".repeat(13)))
    }

    @Test
    fun `네 종류 중 3종 이상이어야 한다`() {
        assertFalse(valid("12345678"))
        assertFalse(valid("abcd1234"))
        assertFalse(valid("ABCDabcd"))
        assertTrue(valid("Abcd1234"))
        assertTrue(valid("abcd123!"))
        assertTrue(valid("ABCD123!"))
        assertTrue(valid("Abcdefg!"))
    }

    @Test
    fun `키보드 기호 32개를 모두 받는다`() {
        val symbols = ('!'..'~').filterNot { it.isLetterOrDigit() }
        assertEquals(32, symbols.size)
        symbols.forEach { assertTrue(valid("abcd123$it"), "기호 $it") }
    }

    @Test
    fun `영어 숫자 기호가 아닌 글자는 거부한다`() {
        val others = listOf("가", "ㅋ", "😀", "漢", "あ", "Ａ", "！", "é", "а", "€", "·", " ", "\t", "　")
        val invisible = listOf("\u200b", "\ufeff", "\u202e", "\u0000", "\u007f", "\u00a0")
        (others + invisible).forEach { assertFalse(valid("Abcd1234$it"), "글자 ${it.codePointAt(0)}") }
    }

    @Test
    fun `null은 거부한다`() {
        assertFalse(valid(null))
    }
}
